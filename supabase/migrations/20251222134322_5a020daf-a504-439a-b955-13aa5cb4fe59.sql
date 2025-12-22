-- Tabela de denúncias
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  content_type TEXT NOT NULL CHECK (content_type IN ('review', 'chat_message', 'profile', 'anime_entry')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'spoiler', 'harassment', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de logs de moderação
CREATE TABLE public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('hide_review', 'unhide_review', 'mark_spoiler', 'warn_user', 'temp_ban', 'unban', 'resolve_report', 'dismiss_report')),
  target_type TEXT NOT NULL CHECK (target_type IN ('review', 'user', 'chat_message', 'report')),
  target_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar coluna is_hidden na tabela reviews (para ocultar reviews moderadas)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Adicionar coluna warned_at e ban_until na tabela profiles (para avisos e bans)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warned_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warn_count INTEGER DEFAULT 0;

-- Habilitar RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Função para verificar se é moderador ou admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('moderator', 'admin')
  )
$$;

-- Políticas RLS para reports

-- Usuários podem criar denúncias
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Usuários podem ver suas próprias denúncias
CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Moderadores e admins podem ver todas as denúncias
CREATE POLICY "Moderators can view all reports"
ON public.reports FOR SELECT
USING (is_moderator_or_admin(auth.uid()));

-- Moderadores e admins podem atualizar denúncias
CREATE POLICY "Moderators can update reports"
ON public.reports FOR UPDATE
USING (is_moderator_or_admin(auth.uid()));

-- Políticas RLS para moderation_logs

-- Moderadores e admins podem inserir logs
CREATE POLICY "Moderators can insert logs"
ON public.moderation_logs FOR INSERT
WITH CHECK (is_moderator_or_admin(auth.uid()) AND auth.uid() = moderator_id);

-- Moderadores e admins podem ver todos os logs
CREATE POLICY "Moderators can view all logs"
ON public.moderation_logs FOR SELECT
USING (is_moderator_or_admin(auth.uid()));

-- Admins podem ver logs no painel admin
CREATE POLICY "Admins can view moderation logs"
ON public.moderation_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));