\set ON_ERROR_STOP on
ALTER TABLE anime_catalog ADD COLUMN type text, ADD COLUMN status text, ADD COLUMN year integer,
 ADD COLUMN score numeric, ADD COLUMN last_synced_at timestamptz, ADD COLUMN image_url text;
CREATE TABLE anime_entries(id uuid,mal_id integer,episodes_watched integer);
CREATE TABLE achievements(id integer);
INSERT INTO anime_catalog(mal_id,type,status,year,score,last_synced_at,image_url)
 SELECT x,'TV','Airing',2026,8,now(),'https://example.test/cover.jpg' FROM generate_series(100,20600) x;
INSERT INTO anime_entries SELECT gen_random_uuid(),x,10 FROM generate_series(1,2001) x;
INSERT INTO achievements VALUES (1),(2),(3);
\ir ../../supabase/migrations/20261014030200_complete_catalog_statistics.sql
DO $$ DECLARE stats jsonb; BEGIN
 stats:=get_catalog_stats();
 IF (stats->>'total_anime')::integer <> 20505 OR (stats->'by_status'->>'Airing')::integer <> 20501 THEN
  RAISE EXCEPTION 'FAIL: catálogo truncado';
 END IF;
 stats:=get_site_stats();
 IF (stats->>'totalAnimes')::integer<>2001 OR (stats->>'totalEpisodes')::integer<>20010 OR (stats->>'totalHours')::integer<>8004 THEN
  RAISE EXCEPTION 'FAIL: listas truncadas';
 END IF;
 IF has_function_privilege('authenticated','public.get_site_stats()','EXECUTE') THEN RAISE EXCEPTION 'FAIL: agregação privada acessível diretamente'; END IF;
END $$;
SELECT 'PASS: agregações acima de 20 mil animes e 2 mil entradas sem truncamento' result;
