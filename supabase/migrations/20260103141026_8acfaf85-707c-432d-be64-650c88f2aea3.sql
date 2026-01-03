-- Tabela para armazenar o estado de sincronização
CREATE TABLE IF NOT EXISTS public.sync_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  mode TEXT NOT NULL DEFAULT 'idle',
  current_page INTEGER NOT NULL DEFAULT 1,
  max_page INTEGER DEFAULT 1000,
  last_error TEXT,
  last_run_at TIMESTAMP WITH TIME ZONE,
  total_synced INTEGER DEFAULT 0,
  is_running BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem
CREATE POLICY "sync_state_admin_all" 
ON public.sync_state 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política para leitura pública (para verificar status)
CREATE POLICY "sync_state_public_read" 
ON public.sync_state 
FOR SELECT 
USING (true);

-- Inserir estado inicial
INSERT INTO public.sync_state (id, mode, current_page, max_page, is_running)
VALUES ('default', 'idle', 1, 1000, false)
ON CONFLICT (id) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sync_state_updated_at
BEFORE UPDATE ON public.sync_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();