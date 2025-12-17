-- Função principal que verifica e desbloqueia conquistas para um usuário
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anime_count integer;
  v_completed_count integer;
  v_review_count integer;
  v_friend_count integer;
  v_list_count integer;
  v_achievement record;
  v_current_value integer;
BEGIN
  -- Conta animes na lista do usuário
  SELECT COUNT(*) INTO v_anime_count
  FROM anime_entries
  WHERE user_id = p_user_id AND is_archived = false;

  -- Conta animes completados
  SELECT COUNT(*) INTO v_completed_count
  FROM anime_entries
  WHERE user_id = p_user_id AND status = 'completed' AND is_archived = false;

  -- Conta reviews
  SELECT COUNT(*) INTO v_review_count
  FROM reviews
  WHERE user_id = p_user_id;

  -- Conta amigos aceitos
  SELECT COUNT(*) INTO v_friend_count
  FROM friendships
  WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
    AND status = 'accepted';

  -- Conta listas customizadas
  SELECT COUNT(*) INTO v_list_count
  FROM custom_lists
  WHERE user_id = p_user_id;

  -- Itera sobre todas as conquistas não desbloqueadas pelo usuário
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.achievement_id = a.id AND ua.user_id = p_user_id
    )
  LOOP
    -- Determina o valor atual baseado no tipo de requisito
    CASE v_achievement.requirement_type
      WHEN 'anime_count' THEN v_current_value := v_anime_count;
      WHEN 'completed_count' THEN v_current_value := v_completed_count;
      WHEN 'review_count' THEN v_current_value := v_review_count;
      WHEN 'friend_count' THEN v_current_value := v_friend_count;
      WHEN 'list_count' THEN v_current_value := v_list_count;
      ELSE v_current_value := 0;
    END CASE;

    -- Se atingiu o requisito, desbloqueia a conquista
    IF v_current_value >= v_achievement.requirement_value THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Trigger para anime_entries (INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_anime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica conquistas para o usuário afetado
  IF TG_OP = 'DELETE' THEN
    PERFORM check_and_unlock_achievements(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM check_and_unlock_achievements(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para reviews
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM check_and_unlock_achievements(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM check_and_unlock_achievements(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para friendships (verifica ambos os usuários)
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_friendship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM check_and_unlock_achievements(OLD.requester_id);
    PERFORM check_and_unlock_achievements(OLD.addressee_id);
    RETURN OLD;
  ELSE
    -- Só verifica quando amizade é aceita
    IF NEW.status = 'accepted' THEN
      PERFORM check_and_unlock_achievements(NEW.requester_id);
      PERFORM check_and_unlock_achievements(NEW.addressee_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para custom_lists
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM check_and_unlock_achievements(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM check_and_unlock_achievements(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Remove triggers antigos se existirem
DROP TRIGGER IF EXISTS on_anime_entry_change ON anime_entries;
DROP TRIGGER IF EXISTS on_review_change ON reviews;
DROP TRIGGER IF EXISTS on_friendship_change ON friendships;
DROP TRIGGER IF EXISTS on_custom_list_change ON custom_lists;

-- Cria os triggers nas tabelas
CREATE TRIGGER on_anime_entry_change
  AFTER INSERT OR UPDATE OR DELETE ON anime_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_check_achievements_anime();

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_check_achievements_review();

CREATE TRIGGER on_friendship_change
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW EXECUTE FUNCTION trigger_check_achievements_friendship();

CREATE TRIGGER on_custom_list_change
  AFTER INSERT OR UPDATE OR DELETE ON custom_lists
  FOR EACH ROW EXECUTE FUNCTION trigger_check_achievements_list();