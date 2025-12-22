-- Tabela para rastrear convites enviados
CREATE TABLE public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  invited_email text,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone
);

-- Índices para performance
CREATE INDEX idx_user_invites_inviter ON public.user_invites(inviter_id);
CREATE INDEX idx_user_invites_code ON public.user_invites(invite_code);
CREATE INDEX idx_user_invites_invited_user ON public.user_invites(invited_user_id);

-- Habilitar RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own invites"
ON public.user_invites FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invited_user_id);

CREATE POLICY "Users can create invites"
ON public.user_invites FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their invites"
ON public.user_invites FOR UPDATE
USING (auth.uid() = inviter_id);

-- Adicionar conquistas de convite
INSERT INTO public.achievements (code, name, description, icon, category, requirement_type, requirement_value, rarity) VALUES
('first_invite', 'Embaixador', 'Convidou seu primeiro amigo para o AniCheck', 'UserPlus', 'social', 'invite_count', 1, 'comum'),
('invite_3', 'Recrutador', 'Convidou 3 amigos para o AniCheck', 'Users', 'social', 'invite_count', 3, 'raro'),
('invite_5', 'Influenciador', 'Convidou 5 amigos para o AniCheck', 'Megaphone', 'social', 'invite_count', 5, 'épico'),
('invite_10', 'Lenda Social', 'Convidou 10 amigos para o AniCheck', 'Crown', 'social', 'invite_count', 10, 'lendário');

-- Atualizar função de verificação de conquistas para incluir convites
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_anime_count integer;
  v_completed_count integer;
  v_review_count integer;
  v_friend_count integer;
  v_list_count integer;
  v_invite_count integer;
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

  -- Conta convites aceitos
  SELECT COUNT(*) INTO v_invite_count
  FROM user_invites
  WHERE inviter_id = p_user_id AND status = 'accepted';

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
      WHEN 'invite_count' THEN v_current_value := v_invite_count;
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

-- Trigger para verificar conquistas quando convite é aceito
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só verifica quando convite é aceito
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    PERFORM check_and_unlock_achievements(NEW.inviter_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_invite_accepted
  AFTER INSERT OR UPDATE ON public.user_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_achievements_invite();