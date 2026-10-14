CREATE TABLE public.jikan_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  evento text NOT NULL,
  base text,
  resultado text NOT NULL DEFAULT 'info',
  pagina integer,
  modo text,
  detalhes jsonb
);
GRANT SELECT ON public.jikan_import_logs TO authenticated;
GRANT ALL ON public.jikan_import_logs TO service_role;
ALTER TABLE public.jikan_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem logs Jikan" ON public.jikan_import_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX jikan_import_logs_created_idx ON public.jikan_import_logs (created_at DESC);