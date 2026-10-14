-- Vínculo MAL→Kitsu verificado pelo ARM para títulos antigos (nunca por nome).
ALTER TABLE public.anime_catalog
  ADD COLUMN IF NOT EXISTS kitsu_id integer,
  ADD COLUMN IF NOT EXISTS kitsu_link_status text,
  ADD COLUMN IF NOT EXISTS kitsu_link_checked_at timestamptz;
COMMENT ON COLUMN public.anime_catalog.kitsu_link_status IS 'vinculado | sem_vinculo | indisponivel (ARM)';

-- Candidatos ao enriquecimento: qualquer vínculo verificado (itens criados/completados ou ARM).
CREATE OR REPLACE FUNCTION public.kitsu_metadata_candidates(p_limit integer DEFAULT 30)
RETURNS TABLE(mal_id integer, kitsu_id integer, remaining bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH k AS (
    SELECT DISTINCT ON (x.mal_id) x.mal_id, x.kitsu_id FROM (
      SELECT i.mal_id, i.kitsu_id, i.created_at, 0 prio FROM public.kitsu_import_items i WHERE i.kitsu_id IS NOT NULL
      UNION ALL
      SELECT a.mal_id, a.kitsu_id, a.kitsu_link_checked_at, 1 FROM public.anime_catalog a
      WHERE a.kitsu_id IS NOT NULL AND a.kitsu_link_status = 'vinculado'
    ) x ORDER BY x.mal_id, x.prio, x.created_at
  ), c AS (
    SELECT k.mal_id, k.kitsu_id FROM k JOIN public.anime_catalog a ON a.mal_id = k.mal_id
    WHERE a.kitsu_metadata_checked_at IS NULL
      AND (a.type IS NULL OR a.type NOT IN ('Music','CM','PV'))
      AND (a.genres IS NULL OR a.genres = '[]'::jsonb OR a.studios IS NULL OR a.studios = '[]'::jsonb OR a.season IS NULL)
  )
  SELECT c.mal_id, c.kitsu_id, (SELECT count(*) FROM c) FROM c ORDER BY c.mal_id LIMIT least(100, greatest(1, p_limit))
$$;

-- Títulos antigos com gênero/estúdio vazio e sem vínculo conhecido; "indisponivel" volta após 1 hora.
CREATE OR REPLACE FUNCTION public.kitsu_link_candidates(p_limit integer DEFAULT 40)
RETURNS TABLE(mal_id integer, remaining bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT a.mal_id FROM public.anime_catalog a
    WHERE (a.type IS NULL OR a.type NOT IN ('Music','CM','PV'))
      AND (a.genres IS NULL OR a.genres = '[]'::jsonb OR a.studios IS NULL OR a.studios = '[]'::jsonb)
      AND a.kitsu_metadata_checked_at IS NULL
      AND a.kitsu_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.kitsu_import_items i WHERE i.mal_id = a.mal_id AND i.kitsu_id IS NOT NULL)
      AND (a.kitsu_link_status IS NULL OR (a.kitsu_link_status = 'indisponivel' AND a.kitsu_link_checked_at < now() - interval '1 hour'))
  )
  SELECT c.mal_id, (SELECT count(*) FROM c) FROM c ORDER BY c.mal_id LIMIT least(100, greatest(1, p_limit))
$$;

-- Grava o resultado do mapeamento sem tocar em outros campos.
CREATE OR REPLACE FUNCTION public.set_kitsu_link(p_mal_id integer, p_kitsu_id integer, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('vinculado','sem_vinculo','indisponivel') THEN RAISE EXCEPTION 'status_invalido'; END IF;
  UPDATE public.anime_catalog SET
    kitsu_id = CASE WHEN p_status = 'vinculado' THEN p_kitsu_id ELSE kitsu_id END,
    kitsu_link_status = p_status, kitsu_link_checked_at = now()
  WHERE mal_id = p_mal_id;
END $$;

REVOKE ALL ON FUNCTION public.kitsu_metadata_candidates(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kitsu_link_candidates(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_kitsu_link(int, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kitsu_metadata_candidates(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.kitsu_link_candidates(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_kitsu_link(int, int, text) TO service_role;