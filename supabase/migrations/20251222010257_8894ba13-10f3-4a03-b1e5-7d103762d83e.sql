-- ===========================================
-- CORREÇÃO 1: Validação em check_and_unlock_achievements
-- Adiciona verificação para que usuário só possa verificar próprias conquistas
-- ===========================================

CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_anime_count integer;
  v_completed_count integer;
  v_review_count integer;
  v_friend_count integer;
  v_list_count integer;
  v_achievement record;
  v_current_value integer;
BEGIN
  -- SEGURANÇA: Validar que usuário só pode verificar próprias conquistas
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Você só pode verificar suas próprias conquistas';
  END IF;

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
$function$;

-- ===========================================
-- CORREÇÃO 2: Sanitização de conteúdo + Rate limiting em notify_friends_on_anime_change
-- ===========================================

CREATE OR REPLACE FUNCTION public.notify_friends_on_anime_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  friend_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_type notification_type;
  user_display_name TEXT;
  pref_column TEXT;
  safe_title TEXT;
  recent_notification_count INTEGER;
BEGIN
  -- RATE LIMITING: Conta notificações recentes do usuário (última hora)
  SELECT COUNT(*) INTO recent_notification_count
  FROM public.notifications n
  WHERE n.created_at > NOW() - INTERVAL '1 hour'
    AND n.data->>'friend_id' = NEW.user_id::text;
  
  -- Se ultrapassou limite de 50 notificações por hora, ignora
  IF recent_notification_count >= 50 THEN
    RETURN NEW;
  END IF;

  -- SANITIZAÇÃO: Buscar e limitar nome do usuário (máximo 50 caracteres)
  SELECT SUBSTRING(COALESCE(display_name, username, 'Um usuário'), 1, 50) 
  INTO user_display_name
  FROM public.profiles WHERE id = NEW.user_id;

  -- SANITIZAÇÃO: Limitar título do anime (máximo 100 caracteres)
  safe_title := SUBSTRING(COALESCE(NEW.title, 'anime'), 1, 100);

  -- Determinar tipo de notificação baseado na ação
  IF TG_OP = 'INSERT' THEN
    notification_title := 'Novo anime adicionado';
    notification_message := user_display_name || ' adicionou "' || safe_title || '" à lista';
    notification_type := 'system';
    pref_column := 'friend_added_anime';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'watching' AND (OLD.status IS NULL OR OLD.status != 'watching') THEN
    notification_title := 'Começou a assistir';
    notification_message := user_display_name || ' começou a assistir "' || safe_title || '"';
    notification_type := 'system';
    pref_column := 'friend_started_watching';
  ELSE
    RETURN NEW;
  END IF;

  -- Inserir notificação para cada amigo aceito que tenha a preferência habilitada
  -- LIMITE: Máximo de 100 amigos por operação para evitar bloqueio longo
  FOR friend_record IN
    SELECT 
      CASE 
        WHEN f.requester_id = NEW.user_id THEN f.addressee_id
        ELSE f.requester_id
      END as friend_id
    FROM public.friendships f
    WHERE (f.requester_id = NEW.user_id OR f.addressee_id = NEW.user_id)
      AND f.status = 'accepted'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np 
          WHERE np.user_id = CASE 
            WHEN f.requester_id = NEW.user_id THEN f.addressee_id
            ELSE f.requester_id
          END
        )
        OR EXISTS (
          SELECT 1 FROM public.notification_preferences np 
          WHERE np.user_id = CASE 
            WHEN f.requester_id = NEW.user_id THEN f.addressee_id
            ELSE f.requester_id
          END
          AND (
            (pref_column = 'friend_added_anime' AND np.friend_added_anime = true)
            OR (pref_column = 'friend_started_watching' AND np.friend_started_watching = true)
          )
        )
      )
    LIMIT 100
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      friend_record.friend_id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object(
        'anime_id', NEW.mal_id,
        'anime_title', safe_title,
        'anime_image', NEW.image_url,
        'friend_id', NEW.user_id,
        'friend_name', user_display_name,
        'status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- ===========================================
-- CORREÇÃO 3: Política RLS para bloquear INSERT direto na tabela notifications
-- Apenas funções SECURITY DEFINER podem inserir
-- ===========================================

CREATE POLICY "Only system functions can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (false);

-- ===========================================
-- CORREÇÃO 4: Constraint de tamanho no display_name do perfil
-- ===========================================

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_display_name_length 
CHECK (display_name IS NULL OR length(display_name) <= 50);