-- Criar tabela para histórico de progresso de episódios
CREATE TABLE public.episode_progress_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anime_entry_id UUID NOT NULL REFERENCES public.anime_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  episodes_from INTEGER NOT NULL DEFAULT 0,
  episodes_to INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para buscas eficientes
CREATE INDEX idx_episode_progress_anime ON public.episode_progress_history(anime_entry_id);
CREATE INDEX idx_episode_progress_user ON public.episode_progress_history(user_id);

-- Habilitar RLS
ALTER TABLE public.episode_progress_history ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver seu próprio histórico
CREATE POLICY "Users can view their own progress history"
ON public.episode_progress_history
FOR SELECT
USING (auth.uid() = user_id);

-- Política: usuários podem inserir seu próprio histórico
CREATE POLICY "Users can insert their own progress history"
ON public.episode_progress_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: usuários podem deletar seu próprio histórico
CREATE POLICY "Users can delete their own progress history"
ON public.episode_progress_history
FOR DELETE
USING (auth.uid() = user_id);