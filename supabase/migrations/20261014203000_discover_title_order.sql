-- Ordena pelo mesmo título visível no card; ignora nome inglês vazio.
BEGIN;
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
      CASE WHEN prm.s='title' AND NOT prm.asc_ THEN lower(coalesce(nullif(f.title_english, ''), f.title)) END DESC NULLS LAST,
      CASE WHEN prm.s='title' AND prm.asc_ THEN lower(coalesce(nullif(f.title_english, ''), f.title)) END ASC NULLS LAST,
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

COMMIT;
