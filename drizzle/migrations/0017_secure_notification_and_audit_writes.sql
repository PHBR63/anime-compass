-- Impede notificações arbitrárias pelo navegador; emissores internos continuam autorizados.
DROP POLICY IF EXISTS "System and service role can insert notifications" ON public.notifications;
REVOKE INSERT ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.notifications TO service_role;

-- Impede registros de auditoria falsificados por usuários autenticados.
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
REVOKE INSERT ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.audit_logs TO service_role;

-- Fecha também o acesso direto à função privilegiada, preservando chamadas dos gatilhos internos.
REVOKE EXECUTE ON FUNCTION public.log_audit_action(text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_action(text, text, text, jsonb, jsonb) TO service_role;