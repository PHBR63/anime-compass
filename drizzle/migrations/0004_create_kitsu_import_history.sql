-- Histórico de execuções da importação do Kitsu (espelha jikan_import_history).
CREATE TABLE public.kitsu_import_history (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  page integer not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms integer not null,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  covers_count integer not null default 0,
  cover_failures integer not null default 0,
  error_message text,
  retryable boolean,
  resolved_at timestamptz,
  resolved_after_ms integer,
  triggered_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kitsu_import_history TO authenticated;
GRANT ALL ON public.kitsu_import_history TO service_role;

ALTER TABLE public.kitsu_import_history ENABLE ROW LEVEL SECURITY;

-- Leitura restrita a administradores; a gravação fica a cargo das funções internas (service_role ignora RLS).
CREATE POLICY kitsu_history_admin_read
  ON public.kitsu_import_history
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));