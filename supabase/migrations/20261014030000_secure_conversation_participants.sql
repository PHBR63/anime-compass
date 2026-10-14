-- Restringe participantes sem excluir mensagens, conversas ou membros existentes.
BEGIN;

-- A função lê o papel anterior sem recursão das políticas e usa a identidade da sessão.
CREATE OR REPLACE FUNCTION public.is_conversation_admin(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_conversation_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_admin(uuid) TO authenticated;

-- Preserva o bootstrap atual: o criador pode entrar como admin somente na conversa vazia.
CREATE OR REPLACE FUNCTION public.can_add_conversation_participant(_conversation_id uuid, _user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    (_role = 'member' AND public.is_conversation_admin(_conversation_id))
    OR (
      _user_id = auth.uid() AND _role = 'admin'
      AND EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND created_by = auth.uid())
      AND NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = _conversation_id)
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_add_conversation_participant(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_add_conversation_participant(uuid, uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Admins add participants or creator bootstraps"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (public.can_add_conversation_participant(conversation_id, user_id, role));

DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
CREATE POLICY "Own preferences or admin membership update"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_conversation_admin(conversation_id))
WITH CHECK (user_id = auth.uid() OR public.is_conversation_admin(conversation_id));

-- RLS decide quais linhas podem mudar; o trigger protege identidade e promoção de papel.
CREATE OR REPLACE FUNCTION public.guard_conversation_participant_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'A identidade do participante não pode ser alterada' USING ERRCODE = '42501';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     AND coalesce(auth.role(), '') <> 'service_role'
     AND NOT public.is_conversation_admin(OLD.conversation_id) THEN
    RAISE EXCEPTION 'Apenas administradores da conversa podem alterar papéis' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_conversation_participant_update
BEFORE UPDATE ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_conversation_participant_update();

COMMIT;
