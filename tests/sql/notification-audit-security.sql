\set ON_ERROR_STOP on
-- Executar exclusivamente em banco local descartável; não altera o ambiente de produção.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public.notifications(id uuid DEFAULT gen_random_uuid(), user_id uuid, title text);
CREATE TABLE public.audit_logs(id uuid DEFAULT gen_random_uuid(), user_id uuid, action text);
GRANT ALL ON public.notifications, public.audit_logs TO anon, authenticated, service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System and service role can insert notifications" ON public.notifications FOR INSERT TO public WITH CHECK(true);
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK(true);
-- Simula a função privilegiada real e um gatilho que a chama internamente.
CREATE FUNCTION public.log_audit_action(text,text,text,jsonb,jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE registro uuid;
BEGIN
 INSERT INTO public.audit_logs(action) VALUES($1) RETURNING id INTO registro;
 RETURN registro;
END $$;
CREATE TABLE public.fixture_event(id uuid DEFAULT gen_random_uuid());
GRANT INSERT ON public.fixture_event TO authenticated;
CREATE FUNCTION public.fixture_emit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.notifications(title) VALUES('legitima');
 PERFORM public.log_audit_action('legitima','fixture_event',NEW.id::text,NULL,NULL);
 RETURN NEW;
END $$;
CREATE TRIGGER fixture_emit AFTER INSERT ON public.fixture_event FOR EACH ROW EXECUTE FUNCTION public.fixture_emit();
\ir ../../drizzle/migrations/0017_secure_notification_and_audit_writes.sql
-- As duas tabelas recusam inserção por visitantes e usuários, mesmo com conteúdo válido.
SET ROLE anon;
DO $$ BEGIN
 BEGIN INSERT INTO public.notifications(title) VALUES('falsa'); RAISE EXCEPTION 'FAIL: visitante criou notificação'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.audit_logs(action) VALUES('falsa'); RAISE EXCEPTION 'FAIL: visitante criou auditoria'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.log_audit_action('falsa','x',NULL,NULL,NULL); RAISE EXCEPTION 'FAIL: visitante acessou RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN INSERT INTO public.notifications(title) VALUES('falsa'); RAISE EXCEPTION 'FAIL: usuário criou notificação'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.audit_logs(action) VALUES('falsa'); RAISE EXCEPTION 'FAIL: usuário criou auditoria'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.log_audit_action('falsa','x',NULL,NULL,NULL); RAISE EXCEPTION 'FAIL: usuário acessou RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Gatilhos internos continuam emitindo mesmo quando a ação é iniciada pelo usuário.
INSERT INTO public.fixture_event DEFAULT VALUES;
RESET ROLE;
SET ROLE service_role;
INSERT INTO public.notifications(title) VALUES('servico');
INSERT INTO public.audit_logs(action) VALUES('servico');
SELECT public.log_audit_action('rpc_servico','x',NULL,NULL,NULL) IS NOT NULL AS rpc_funcional;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.notifications) <> 2 THEN RAISE EXCEPTION 'FAIL: emissores legítimos de notificações'; END IF;
 IF (SELECT count(*) FROM public.audit_logs) <> 3 THEN RAISE EXCEPTION 'FAIL: emissores legítimos de auditoria'; END IF;
END $$;
SELECT 'PASS: inserções e RPC bloqueadas para clientes; serviço e gatilhos preservados' AS resultado;