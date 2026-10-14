-- Preserva o contrato da API anterior sem alterar dados; cards da Descobrir continuam reduzidos.
BEGIN;
CREATE OR REPLACE FUNCTION public.discover_filtered(p jsonb)
RETURNS SETOF public.anime_catalog LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_search text := nullif(btrim(p->>'search'),'');
  v_genre text := nullif(btrim(p->>'genre'),'');
  v_studio text := nullif(btrim(p->>'studio'),'');
  v_types text[] := string_to_array(nullif(p->>'type',''), ',');
  v_status text := nullif(lower(btrim(p->>'status')), '');
  v_seasons text[] := string_to_array(nullif(lower(p->>'season'),''), ',');
  v_season_year int := nullif(p->>'season_year','')::int;
  v_ymin int := nullif(p->>'year_min','')::int;
  v_ymax int := nullif(p->>'year_max','')::int;
  v_smin numeric := nullif(p->>'score_min','')::numeric;
  v_smax numeric := nullif(p->>'score_max','')::numeric;
  v_image boolean := nullif(p->>'has_image','')::boolean;
  v_synopsis boolean := nullif(p->>'has_synopsis_pt','')::boolean;
  v_hide boolean := coalesce(nullif(p->>'hide_in_list','')::boolean, false);
  v_uid uuid := auth.uid();
  v_statuses text[];
  v_pattern text;
  v_name text;
BEGIN
  IF v_ymin IS NOT NULL AND v_ymax IS NOT NULL AND v_ymin>v_ymax THEN
    RAISE EXCEPTION 'intervalo_ano_invalido' USING ERRCODE='22023';
  END IF;
  -- IDs do contrato anterior são resolvidos por vínculos já presentes no catálogo.
  -- O nome canônico inclui registros Kitsu sem ID MAL de gênero/estúdio; nenhum ID é criado.
  IF v_genre ~ '^[0-9]{1,9}$' THEN
    SELECT g->>'name' INTO v_name FROM anime_catalog c,
      jsonb_array_elements(CASE WHEN jsonb_typeof(c.genres)='array' THEN c.genres ELSE '[]'::jsonb END) g
      WHERE g->>'mal_id'=v_genre AND nullif(g->>'name','') IS NOT NULL LIMIT 1;
    v_genre:=coalesce(v_name,v_genre);
  END IF;
  IF v_studio ~ '^[0-9]{1,9}$' THEN
    SELECT g->>'name' INTO v_name FROM anime_catalog c,
      jsonb_array_elements(CASE WHEN jsonb_typeof(c.studios)='array' THEN c.studios ELSE '[]'::jsonb END) g
      WHERE g->>'mal_id'=v_studio AND nullif(g->>'name','') IS NOT NULL LIMIT 1;
    v_studio:=coalesce(v_name,v_studio);
  END IF;
  IF v_status IS NOT NULL THEN
    SELECT array_agg(DISTINCT expanded) INTO v_statuses
    FROM unnest(string_to_array(v_status,',')) token
    CROSS JOIN LATERAL unnest(CASE
      WHEN btrim(token) IN ('airing','currently airing') THEN ARRAY['Airing','Currently Airing']
      WHEN btrim(token) IN ('finished','finished airing') THEN ARRAY['Finished Airing']
      WHEN btrim(token) IN ('upcoming','not yet aired') THEN ARRAY['Not yet aired']
      ELSE ARRAY[btrim(token)] END) expanded;
  END IF;
  IF v_search IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;
  RETURN QUERY SELECT c.* FROM public.anime_catalog c
  WHERE (c.type IS NULL OR c.type NOT IN ('Music','CM','PV'))
    AND (v_pattern IS NULL OR c.title ILIKE v_pattern OR c.title_english ILIKE v_pattern OR c.title_japanese ILIKE v_pattern)
    AND (v_genre IS NULL OR c.genres @> jsonb_build_array(jsonb_build_object('name',v_genre)))
    AND (v_studio IS NULL OR c.studios @> jsonb_build_array(jsonb_build_object('name',v_studio)))
    AND (v_types IS NULL OR c.type=ANY(v_types))
    AND (v_statuses IS NULL OR c.status=ANY(v_statuses))
    AND (v_seasons IS NULL OR c.season=ANY(v_seasons))
    AND (v_season_year IS NULL OR c.year=v_season_year)
    AND (v_ymin IS NULL OR c.year>=v_ymin)
    AND (v_ymax IS NULL OR c.year<=v_ymax)
    AND (v_smin IS NULL OR c.score>=v_smin)
    AND (v_smax IS NULL OR c.score<=v_smax)
    AND (v_image IS NULL OR (c.image_url IS NOT NULL)=v_image)
    AND (v_synopsis IS NULL OR (c.synopsis_pt IS NOT NULL)=v_synopsis)
    AND (NOT v_hide OR v_uid IS NULL OR NOT EXISTS(
      SELECT 1 FROM public.anime_entries e WHERE e.user_id=v_uid AND e.mal_id=c.mal_id AND e.is_archived=false));
END $$;
REVOKE ALL ON FUNCTION public.discover_filtered(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_filtered(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.discover_catalog(p jsonb, p_sort text DEFAULT 'score'::text, p_order text DEFAULT 'desc'::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH prm AS (
    SELECT least(60, greatest(1, coalesce(p_limit, 24))) AS lim,
           greatest(1, coalesce(p_page, 1)) AS pg,
           CASE WHEN p_sort IN ('score','popularity','year','title','members','rank','created_at','updated_at') THEN p_sort ELSE 'score' END AS s,
           lower(coalesce(p_order,'desc')) = 'asc' AS asc_
  ), f AS MATERIALIZED (
    SELECT * FROM public.discover_filtered(p)
  ), o AS (
    SELECT row_number() OVER (ORDER BY
      CASE WHEN prm.s='score' AND NOT prm.asc_ THEN f.score END DESC NULLS LAST,
      CASE WHEN prm.s='score' AND prm.asc_ THEN f.score END ASC NULLS LAST,
      CASE WHEN prm.s='popularity' AND NOT prm.asc_ THEN f.popularity END DESC NULLS LAST,
      CASE WHEN prm.s='popularity' AND prm.asc_ THEN f.popularity END ASC NULLS LAST,
      CASE WHEN prm.s='members' AND NOT prm.asc_ THEN f.members END DESC NULLS LAST,
      CASE WHEN prm.s='members' AND prm.asc_ THEN f.members END ASC NULLS LAST,
      CASE WHEN prm.s='year' AND NOT prm.asc_ THEN f.year END DESC NULLS LAST,
      CASE WHEN prm.s='year' AND prm.asc_ THEN f.year END ASC NULLS LAST,
      CASE WHEN prm.s='title' AND NOT prm.asc_ THEN lower(coalesce(f.title_english, f.title)) END DESC NULLS LAST,
      CASE WHEN prm.s='title' AND prm.asc_ THEN lower(coalesce(f.title_english, f.title)) END ASC NULLS LAST,
      CASE WHEN prm.s='rank' AND NOT prm.asc_ THEN f.rank END DESC NULLS LAST,
      CASE WHEN prm.s='rank' AND prm.asc_ THEN f.rank END ASC NULLS LAST,
      CASE WHEN prm.s='created_at' AND NOT prm.asc_ THEN f.created_at END DESC NULLS LAST,
      CASE WHEN prm.s='created_at' AND prm.asc_ THEN f.created_at END ASC NULLS LAST,
      CASE WHEN prm.s='updated_at' AND NOT prm.asc_ THEN f.updated_at END DESC NULLS LAST,
      CASE WHEN prm.s='updated_at' AND prm.asc_ THEN f.updated_at END ASC NULLS LAST,
      f.mal_id ASC) AS rn, f.*
    FROM f, prm
  )
  SELECT jsonb_build_object(
    'items', coalesce((SELECT jsonb_agg(CASE WHEN p->>'full_record' = 'true' THEN to_jsonb(o) - 'rn' ELSE jsonb_build_object('id', o.id, 'mal_id', o.mal_id, 'title', o.title,
        'title_english', o.title_english, 'image_url', o.image_url, 'local_image_url', o.local_image_url,
        'score', o.score, 'type', o.type, 'year', o.year, 'season', o.season, 'episodes', o.episodes,
        'status', o.status) END ORDER BY o.rn)
      FROM o, prm WHERE o.rn > (prm.pg - 1) * prm.lim AND o.rn <= prm.pg * prm.lim), '[]'::jsonb),
    'total', (SELECT count(*) FROM f),
    'page', prm.pg, 'limit', prm.lim,
    'has_next', (prm.pg * prm.lim) < (SELECT count(*) FROM f),
    'hide_in_list_applied', coalesce(nullif(p->>'hide_in_list','')::boolean, false) AND auth.uid() IS NOT NULL)
  FROM prm
$function$;
CREATE OR REPLACE FUNCTION public.discover_facets()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH e AS (
    SELECT c.* FROM public.anime_catalog c WHERE c.type IS NULL OR c.type NOT IN ('Music','CM','PV')
  )
  SELECT jsonb_build_object(
    'scope', 'catalogo_elegivel',
    'total', (SELECT count(*) FROM e),
    'genres', coalesce((SELECT jsonb_agg(jsonb_build_object('name', n, 'count', k, 'mal_id', mid) ORDER BY n) FROM (
        SELECT g->>'name' n, count(DISTINCT e.mal_id) k, min(CASE WHEN g->>'mal_id' ~ '^[0-9]{1,9}$' THEN (g->>'mal_id')::int END) mid FROM e, jsonb_array_elements(CASE WHEN jsonb_typeof(e.genres)='array' THEN e.genres ELSE '[]'::jsonb END) g
        WHERE nullif(btrim(g->>'name'),'') IS NOT NULL GROUP BY 1) s), '[]'::jsonb),
    'studios', coalesce((SELECT jsonb_agg(jsonb_build_object('name', n, 'count', k, 'mal_id', mid) ORDER BY n) FROM (
        SELECT g->>'name' n, count(DISTINCT e.mal_id) k, min(CASE WHEN g->>'mal_id' ~ '^[0-9]{1,9}$' THEN (g->>'mal_id')::int END) mid FROM e, jsonb_array_elements(CASE WHEN jsonb_typeof(e.studios)='array' THEN e.studios ELSE '[]'::jsonb END) g
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
$function$;
COMMIT;

