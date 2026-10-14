\set ON_ERROR_STOP on
-- Fixture descartável: executar somente no cluster local de testes.
CREATE SCHEMA auth;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE public.conversations (id uuid PRIMARY KEY, created_by uuid);
CREATE TABLE public.conversation_participants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid REFERENCES conversations(id),
 user_id uuid, role text NOT NULL DEFAULT 'member', last_read_at timestamptz,
 is_pinned boolean DEFAULT false, pinned_at timestamptz, UNIQUE(conversation_id,user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.conversation_participants TO authenticated;
INSERT INTO public.conversations VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011');
CREATE POLICY fixture_select ON public.conversation_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add participants" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Users can update their own participation" ON public.conversation_participants FOR UPDATE TO authenticated USING (auth.uid()=user_id);
\ir ../../supabase/migrations/20261014030000_secure_conversation_participants.sql
SET ROLE authenticated;
SELECT set_config('test.uid','00000000-0000-4000-8000-000000000011',false);
-- Criador pode iniciar conversa e adicionar membro; registros anteriores não são apagados.
INSERT INTO public.conversation_participants(conversation_id,user_id,role)
 VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','admin');
INSERT INTO public.conversation_participants(conversation_id,user_id,role)
 VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012','member');
SELECT set_config('test.uid','00000000-0000-4000-8000-000000000013',false);
DO $$ BEGIN
 BEGIN
  INSERT INTO public.conversation_participants(conversation_id,user_id,role)
   VALUES ('00000000-0000-4000-8000-000000000001',auth.uid(),'admin');
  RAISE EXCEPTION 'FAIL: outsider entrou na conversa';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SELECT set_config('test.uid','00000000-0000-4000-8000-000000000012',false);
UPDATE public.conversation_participants SET last_read_at=now(),is_pinned=true WHERE user_id=auth.uid();
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.conversation_participants WHERE user_id=auth.uid() AND is_pinned AND last_read_at IS NOT NULL) THEN
  RAISE EXCEPTION 'FAIL: preferências bloqueadas';
 END IF;
 BEGIN
  UPDATE public.conversation_participants SET role='admin' WHERE user_id=auth.uid();
  RAISE EXCEPTION 'FAIL: membro promoveu a si mesmo';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.conversation_participants SET user_id='00000000-0000-4000-8000-000000000013' WHERE user_id=auth.uid();
  RAISE EXCEPTION 'FAIL: identidade alterada';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SELECT set_config('test.uid','00000000-0000-4000-8000-000000000011',false);
UPDATE public.conversation_participants SET role='admin' WHERE user_id='00000000-0000-4000-8000-000000000012';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.conversation_participants WHERE user_id='00000000-0000-4000-8000-000000000012' AND role='admin') THEN
  RAISE EXCEPTION 'FAIL: admin não consegue promover';
 END IF;
 IF (SELECT count(*) FROM public.conversation_participants) <> 2 THEN RAISE EXCEPTION 'FAIL: membros inesperados'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: bootstrap, adição, preferências, promoção autorizada e bloqueios de acesso' result;
