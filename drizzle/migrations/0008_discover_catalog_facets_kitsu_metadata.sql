-- Proveniência dos metadados complementares e checkpoint do enriquecimento Kitsu.
ALTER TABLE public.anime_catalog ADD COLUMN IF NOT EXISTS metadata_sources jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.anime_catalog ADD COLUMN IF NOT EXISTS kitsu_metadata_checked_at timestamptz;
ALTER TABLE public.anime_catalog ADD COLUMN IF NOT EXISTS kitsu_metadata_result text;
COMMENT ON COLUMN public.anime_catalog.metadata_sources IS 'Origem de cada campo complementado (ex.: {"genres":"kitsu","season":"estimativa_data_estreia_kitsu"}).';
COMMENT ON COLUMN public.anime_catalog.kitsu_metadata_result IS 'Resultado da última checagem de metadados no Kitsu: preenchido, sem_dados_na_fonte, ausente_na_fonte, nada_a_preencher.';

CREATE INDEX IF NOT EXISTS anime_entries_user_mal_idx ON public.anime_entries (user_id, mal_id);

-- Conjunto elegível da Descobrir com todos os filtros; usuário vem do JWT validado (auth.uid()).
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
    -- Aliases: "Airing" (legado) e "Currently Airing" (Jikan/Kitsu) são o mesmo estado.
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
      SELECT 1 FROM public.anime_entries e WHERE e.user_id = v_uid AND e.mal_id = c.mal_id));
END $$;

-- Página da Descobrir com total exato, ordenação estável (desempate por mal_id) e projeção de card.
CREATE OR REPLACE FUNCTION public.discover_catalog(p jsonb, p_sort text DEFAULT 'score', p_order text DEFAULT 'desc', p_page int DEFAULT 1, p_limit int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit int := least(60, greatest(1, coalesce(p_limit, 24)));
  v_page int := greatest(1, coalesce(p_page, 1));
  v_sort text := CASE WHEN p_sort IN ('score','popularity','year','title','members') THEN p_sort ELSE 'score' END;
  v_asc boolean := lower(coalesce(p_order,'desc')) = 'asc';
  v_total bigint;
  v_items jsonb;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _discover_f ON COMMIT DROP AS SELECT * FROM public.anime_catalog WITH NO DATA;
  TRUNCATE _discover_f;
  INSERT INTO _discover_f SELECT * FROM public.discover_filtered(p);
  SELECT count(*) INTO v_total FROM _discover_f;
  SELECT coalesce(jsonb_agg(x.j ORDER BY x.rn), '[]'::jsonb) INTO v_items FROM (
    SELECT row_number() OVER (ORDER BY
      CASE WHEN v_sort='score' AND NOT v_asc THEN f.score END DESC NULLS LAST,
      CASE WHEN v_sort='score' AND v_asc THEN f.score END ASC NULLS LAST,
      CASE WHEN v_sort='popularity' AND NOT v_asc THEN f.popularity END DESC NULLS LAST,
      CASE WHEN v_sort='popularity' AND v_asc THEN f.popularity END ASC NULLS LAST,
      CASE WHEN v_sort='members' AND NOT v_asc THEN f.members END DESC NULLS LAST,
      CASE WHEN v_sort='members' AND v_asc THEN f.members END ASC NULLS LAST,
      CASE WHEN v_sort='year' AND NOT v_asc THEN f.year END DESC NULLS LAST,
      CASE WHEN v_sort='year' AND v_asc THEN f.year END ASC NULLS LAST,
      CASE WHEN v_sort='title' AND NOT v_asc THEN lower(coalesce(f.title_english, f.title)) END DESC NULLS LAST,
      CASE WHEN v_sort='title' AND v_asc THEN lower(coalesce(f.title_english, f.title)) END ASC NULLS LAST,
      f.mal_id ASC) AS rn,
      jsonb_build_object('id', f.id, 'mal_id', f.mal_id, 'title', f.title, 'title_english', f.title_english,
        'image_url', f.image_url, 'local_image_url', f.local_image_url, 'score', f.score, 'type', f.type,
        'year', f.year, 'season', f.season, 'episodes', f.episodes, 'status', f.status) AS j
    FROM _discover_f f
    ORDER BY rn
    OFFSET (v_page - 1) * v_limit LIMIT v_limit
  ) x;
  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'limit', v_limit,
    'has_next', (v_page * v_limit) < v_total,
    'hide_in_list_applied', coalesce(nullif(p->>'hide_in_list','')::boolean, false) AND auth.uid() IS NOT NULL);
END $$;

-- Facetas do catálogo elegível inteiro (escopo global, sem limite de 1000 linhas).
CREATE OR REPLACE FUNCTION public.discover_facets()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH e AS (
    SELECT c.* FROM public.anime_catalog c WHERE c.type IS NULL OR c.type NOT IN ('Music','CM','PV')
  )
  SELECT jsonb_build_object(
    'scope', 'catalogo_elegivel',
    'total', (SELECT count(*) FROM e),
    'genres', coalesce((SELECT jsonb_agg(jsonb_build_object('name', n, 'count', k) ORDER BY n) FROM (
        SELECT g->>'name' n, count(DISTINCT e.mal_id) k FROM e, jsonb_array_elements(CASE WHEN jsonb_typeof(e.genres)='array' THEN e.genres ELSE '[]'::jsonb END) g
        WHERE nullif(btrim(g->>'name'),'') IS NOT NULL GROUP BY 1) s), '[]'::jsonb),
    'studios', coalesce((SELECT jsonb_agg(jsonb_build_object('name', n, 'count', k) ORDER BY n) FROM (
        SELECT g->>'name' n, count(DISTINCT e.mal_id) k FROM e, jsonb_array_elements(CASE WHEN jsonb_typeof(e.studios)='array' THEN e.studios ELSE '[]'::jsonb END) g
        WHERE nullif(btrim(g->>'name'),'') IS NOT NULL GROUP BY 1) s), '[]'::jsonb),
    'types', coalesce((SELECT jsonb_agg(jsonb_build_object('value', t, 'count', k) ORDER BY k DESC) FROM (
        SELECT coalesce(type,'__sem_tipo') t, count(*) k FROM e GROUP BY 1) s), '[]'::jsonb),
    'years', coalesce((SELECT jsonb_agg(y ORDER BY y DESC) FROM (SELECT DISTINCT year y FROM e WHERE year IS NOT NULL) s), '[]'::jsonb),
    'statuses', jsonb_build_object(
      'airing', (SELECT count(*) FROM e WHERE status IN ('Airing','Currently Airing')),
      'finished', (SELECT count(*) FROM e WHERE status = 'Finished Airing'),
      'upcoming', (SELECT count(*) FROM e WHERE status = 'Not yet aired'),
      'unknown', (SELECT count(*) FROM e WHERE status IS NULL))
  )
$$;

REVOKE ALL ON FUNCTION public.discover_filtered(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.discover_catalog(jsonb, text, text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.discover_facets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discover_catalog(jsonb, text, text, int, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discover_facets() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discover_filtered(jsonb) TO service_role;

-- Candidatos ao enriquecimento: animes criados pelo Kitsu (vínculo MAL já verificado) sem gênero/estúdio/temporada.
CREATE OR REPLACE FUNCTION public.kitsu_metadata_candidates(p_limit int DEFAULT 30)
RETURNS TABLE(mal_id int, kitsu_id int, remaining bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH k AS (
    SELECT DISTINCT ON (i.mal_id) i.mal_id, i.kitsu_id FROM public.kitsu_import_items i
    WHERE i.acao = 'criado' AND i.kitsu_id IS NOT NULL ORDER BY i.mal_id, i.created_at
  ), c AS (
    SELECT k.mal_id, k.kitsu_id FROM k JOIN public.anime_catalog a ON a.mal_id = k.mal_id
    WHERE a.kitsu_metadata_checked_at IS NULL
      AND (a.genres IS NULL OR a.genres = '[]'::jsonb OR a.studios IS NULL OR a.studios = '[]'::jsonb OR a.season IS NULL)
  )
  SELECT c.mal_id, c.kitsu_id, (SELECT count(*) FROM c) FROM c ORDER BY c.mal_id LIMIT least(100, greatest(1, p_limit))
$$;

-- Aplica metadados do Kitsu somente em campos vazios, de forma atômica, registrando proveniência.
CREATE OR REPLACE FUNCTION public.apply_kitsu_metadata(p_mal_id int, p_genres jsonb, p_studios jsonb, p_season text, p_year int, p_result text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.anime_catalog%ROWTYPE;
  v_fill_g boolean; v_fill_s boolean; v_fill_season boolean; v_fill_year boolean;
  v_campos text[] := '{}';
BEGIN
  SELECT * INTO r FROM public.anime_catalog WHERE mal_id = p_mal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  v_fill_g := (r.genres IS NULL OR r.genres = '[]'::jsonb) AND jsonb_typeof(p_genres) = 'array' AND jsonb_array_length(p_genres) > 0;
  v_fill_s := (r.studios IS NULL OR r.studios = '[]'::jsonb) AND jsonb_typeof(p_studios) = 'array' AND jsonb_array_length(p_studios) > 0;
  v_fill_year := r.year IS NULL AND p_year IS NOT NULL;
  v_fill_season := r.season IS NULL AND p_season IN ('winter','spring','summer','fall') AND (r.year IS NULL OR r.year = p_year);
  IF v_fill_g THEN v_campos := v_campos || 'genres'; END IF;
  IF v_fill_s THEN v_campos := v_campos || 'studios'; END IF;
  IF v_fill_year THEN v_campos := v_campos || 'year'; END IF;
  IF v_fill_season THEN v_campos := v_campos || 'season'; END IF;
  UPDATE public.anime_catalog SET
    genres = CASE WHEN v_fill_g THEN p_genres ELSE genres END,
    studios = CASE WHEN v_fill_s THEN p_studios ELSE studios END,
    year = CASE WHEN v_fill_year THEN p_year ELSE year END,
    season = CASE WHEN v_fill_season THEN p_season ELSE season END,
    metadata_sources = metadata_sources || jsonb_strip_nulls(jsonb_build_object(
      'genres', CASE WHEN v_fill_g THEN 'kitsu' END,
      'studios', CASE WHEN v_fill_s THEN 'kitsu' END,
      'year', CASE WHEN v_fill_year THEN 'estimativa_data_estreia_kitsu' END,
      'season', CASE WHEN v_fill_season THEN 'estimativa_data_estreia_kitsu' END)),
    kitsu_metadata_checked_at = now(),
    kitsu_metadata_result = CASE WHEN cardinality(v_campos) > 0 THEN 'preenchido' ELSE coalesce(p_result, 'nada_a_preencher') END,
    updated_at = now()
  WHERE mal_id = p_mal_id;
  RETURN jsonb_build_object('ok', true, 'campos', to_jsonb(v_campos));
END $$;

REVOKE ALL ON FUNCTION public.kitsu_metadata_candidates(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_kitsu_metadata(int, jsonb, jsonb, text, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kitsu_metadata_candidates(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_kitsu_metadata(int, jsonb, jsonb, text, int, text) TO service_role;