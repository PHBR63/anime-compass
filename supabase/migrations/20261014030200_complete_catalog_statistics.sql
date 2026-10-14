-- Estatísticas calculadas no banco inteiro, sem o limite de linhas do PostgREST.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_catalog_stats()
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT jsonb_build_object(
  'total_anime', count(*), 'with_images', count(image_url),
  'by_type', coalesce((SELECT jsonb_object_agg(type, quantity) FROM
    (SELECT type,count(*) quantity FROM anime_catalog WHERE type IS NOT NULL GROUP BY type) t),'{}'::jsonb),
  'by_status', coalesce((SELECT jsonb_object_agg(status, quantity) FROM
    (SELECT status,count(*) quantity FROM anime_catalog WHERE status IS NOT NULL GROUP BY status) t),'{}'::jsonb),
  'year_range', jsonb_build_object('min',coalesce(min(year),0),'max',coalesce(max(year),0)),
  'score_range', jsonb_build_object('min',coalesce(min(score),0),'max',coalesce(max(score),0)),
  'last_sync', max(last_synced_at)
 ) FROM anime_catalog;
$$;
CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT jsonb_build_object(
  'totalAnimes', count(DISTINCT mal_id),
  'totalEpisodes', coalesce(sum(episodes_watched),0),
  'totalHours', round(coalesce(sum(episodes_watched),0)*24.0/60.0),
  'totalAchievements', (SELECT count(*) FROM achievements)
 ) FROM anime_entries;
$$;
-- As funções HTTP públicas continuam expondo somente os mesmos indicadores agregados.
REVOKE ALL ON FUNCTION public.get_catalog_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_site_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_site_stats() TO service_role;
COMMIT;
