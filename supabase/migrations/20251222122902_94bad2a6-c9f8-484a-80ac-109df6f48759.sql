-- ==============================================================
-- SISTEMA DE ADMIN: Tabelas de Auditoria e Logs de Erros
-- ==============================================================

-- 1. Promover o e-mail do administrador (não exposto no repositório)
-- Primeiro, buscar o ID do usuário e inserir na tabela user_roles
-- A promoção real de administradores é feita pelo painel Admin (função admin_set_user_role),
-- ou por migração pontual executada manualmente com o e-mail inserido no momento da execução.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = current_setting('app.admin_email', true)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Criar tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 3. Criar tabela de logs de erros
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  error_stack text,
  error_context jsonb,
  url text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);

-- 4. Habilitar RLS nas tabelas
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS - Apenas admins podem visualizar logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all error logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Política para inserção de logs (sistema pode inserir)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can insert error logs"
ON public.error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. Função para registrar logs de auditoria (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_action text,
  p_table_name text,
  p_record_id text DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 8. Função para registrar erros (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_error(
  p_error_message text,
  p_error_stack text DEFAULT NULL,
  p_error_context jsonb DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.error_logs (user_id, error_message, error_stack, error_context, url, user_agent)
  VALUES (auth.uid(), p_error_message, p_error_stack, p_error_context, p_url, p_user_agent)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 9. Triggers para auditoria automática em ações críticas

-- Trigger para mudanças de role
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_action('ROLE_ASSIGNED', 'user_roles', NEW.user_id::text, NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_action('ROLE_CHANGED', 'user_roles', NEW.user_id::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_action('ROLE_REMOVED', 'user_roles', OLD.user_id::text, row_to_json(OLD)::jsonb, NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();

-- Trigger para deleção de perfis (ação crítica)
CREATE OR REPLACE FUNCTION public.audit_profile_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_audit_action('PROFILE_DELETED', 'profiles', OLD.id::text, row_to_json(OLD)::jsonb, NULL);
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_deletion();

-- 10. Função para admins gerenciarem roles
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_target_user_id uuid,
  p_new_role app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o usuário que está executando é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles';
  END IF;
  
  -- Upsert do role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id, role) DO UPDATE SET role = p_new_role;
  
  RETURN true;
END;
$$;

-- 11. Função para admins removerem roles
CREATE OR REPLACE FUNCTION public.admin_remove_user_role(
  p_target_user_id uuid,
  p_role app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o usuário que está executando é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem remover roles';
  END IF;
  
  -- Não permite remover o próprio role de admin
  IF p_target_user_id = auth.uid() AND p_role = 'admin' THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio role de admin';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id AND role = p_role;
  
  RETURN true;
END;
$$;

-- 12. Habilitar realtime para logs (opcional, para dashboard em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
