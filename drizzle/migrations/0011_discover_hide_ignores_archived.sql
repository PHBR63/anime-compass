-- Ocultar minha lista considera só entradas ativas (is_archived = false), igual ao contexto da lista no app.
-- Identidade continua vindo exclusivamente de auth.uid() (JWT validado), nunca de parâmetro.
CREATE OR REPLACE FUNCTION public.discover_filtered(p jsonb)
RETURNS SETOF public.anime_catalog
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_search text := nullif(btrim(coalesce(p->>'search','')), '');
  v_genre text := nullif(btrim(coalesce(p->>'genre','')), '');
  v_studio text := nullif(btrim(coalesce(p->>'studio','')), '');
  v_type text := nullif(btrim(coalesce(p->>'type','')), '');
  v_status text := nullif(lower(btrim(coalesce(p->>'status',''))), '');
  v_season text := nullif(lower(btrim(coalesce(p->>'season',''))), '');
  v_season_year int := nullif(p->>'season_year','')::int;
  v_ymin int := nullif(p->>'year_min','')::int;
  v_ymax int := nullif(p->>'year_max','')::int;
  v_smin numeric := nullif(p->>'score_min','')::numeric;
  v_hide boolean := coalesce(nullif(p->>'hide_in_list','')::boolean, false);
  v_uid uuid := auth.uid();
  v_statuses text[];
  v_pattern text;
BEGIN
  IF v_ymin IS NOT NULL AND v_ymax IS NOT NULL AND v_ymin > v_ymax THEN
    RAISE EXCEPTION 'intervalo_ano_invalido' USING ERRCODE = '22023';
  END IF;
  IF v_status IS NOT NULL THEN
    v_statuses := CASE
      WHEN v_status IN ('airing','currently airing') THEN ARRAY['Airing','Currently Airing']
      WHEN v_status IN ('finished','finished airing') THEN ARRAY['Finished Airing']
      WHEN v_status IN ('upcoming','not yet aired') THEN ARRAY['Not yet aired']
      ELSE ARRAY[p->>'status'] END;
  END IF;
  IF v_search IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;
  RETURN QUERY
  SELECT c.* FROM public.anime_catalog c
  WHERE (c.type IS NULL OR c.type NOT IN ('Music','CM','PV'))
    AND (v_pattern IS NULL OR c.title ILIKE v_pattern OR c.title_english ILIKE v_pattern OR c.title_japanese ILIKE v_pattern)
    AND (v_genre IS NULL OR c.genres @> jsonb_build_array(jsonb_build_object('name', v_genre)))
    AND (v_studio IS NULL OR c.studios @> jsonb_build_array(jsonb_build_object('name', v_studio)))
    AND (v_type IS NULL OR c.type = v_type)
    AND (v_statuses IS NULL OR c.status = ANY(v_statuses))
    AND (v_season IS NULL OR c.season = v_season)
    AND (v_season_year IS NULL OR c.year = v_season_year)
    AND (v_ymin IS NULL OR c.year >= v_ymin)
    AND (v_ymax IS NULL OR c.year <= v_ymax)
    AND (v_smin IS NULL OR c.score >= v_smin)
    AND (NOT v_hide OR v_uid IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.anime_entries e
      WHERE e.user_id = v_uid AND e.mal_id = c.mal_id AND e.is_archived = false));
END $$;
REVOKE ALL ON FUNCTION public.discover_filtered(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_filtered(jsonb) TO service_role;