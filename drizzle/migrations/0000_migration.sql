CREATE TABLE public.jikan_import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  page integer NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  covers_count integer NOT NULL DEFAULT 0,
  cover_failures integer NOT NULL DEFAULT 0,
  error_message text,
  retryable boolean,
  resolved_at timestamptz,
  resolved_after_ms integer,
  triggered_by uuid
);
GRANT SELECT ON public.jikan_import_history TO authenticated;
GRANT ALL ON public.jikan_import_history TO service_role;
ALTER TABLE public.jikan_import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem histórico Jikan" ON public.jikan_import_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX jikan_import_history_started_idx ON public.jikan_import_history (started_at DESC);
CREATE INDEX jikan_import_history_unresolved_idx ON public.jikan_import_history (status) WHERE resolved_at IS NULL;