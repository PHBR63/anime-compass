-- Correção de segurança + diagnóstico: garantir que usuários anônimos NÃO consigam inserir em conversations
-- (Hoje o role anon tem privilégio de INSERT, e depende só do RLS. Vamos bloquear no nível de privilégios também.)

REVOKE INSERT ON TABLE public.conversations FROM anon;

-- Garantir que usuários autenticados tenham INSERT
GRANT INSERT ON TABLE public.conversations TO authenticated;

-- (Opcional mas seguro) garantir que anon não tenha UPDATE/DELETE também
REVOKE UPDATE, DELETE ON TABLE public.conversations FROM anon;

-- Garantir SELECT para authenticated (conforme RLS)
GRANT SELECT, UPDATE, DELETE ON TABLE public.conversations TO authenticated;