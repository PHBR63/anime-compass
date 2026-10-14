CREATE TABLE public.translation_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id integer NOT NULL UNIQUE,
  title text NOT NULL,
  source_text text NOT NULL,
  current_pt text,
  suggested_text text NOT NULL,
  reason text NOT NULL DEFAULT 'missing',
  status text NOT NULL DEFAULT 'pending',
  origin text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.translation_suggestions TO authenticated;
GRANT ALL ON public.translation_suggestions TO service_role;
ALTER TABLE public.translation_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem sugestões de tradução" ON public.translation_suggestions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX translation_suggestions_pending_idx ON public.translation_suggestions (created_at DESC) WHERE status = 'pending';