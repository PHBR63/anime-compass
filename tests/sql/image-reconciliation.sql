\set ON_ERROR_STOP on
CREATE SCHEMA storage;
CREATE TABLE storage.objects(bucket_id text, name text);
CREATE TABLE public.anime_catalog(mal_id integer PRIMARY KEY,local_image_url text);
INSERT INTO public.anime_catalog VALUES
 (1,'https://xhyairbedwqezegopjan.supabase.co/storage/v1/object/public/anime-images/1.webp'),
 (2,'https://xhyairbedwqezegopjan.supabase.co/storage/v1/object/public/anime-images/2.jpg'),
 (3,'https://xhyairbedwqezegopjan.supabase.co/storage/v1/object/public/anime-images/3.jpg'),
 (4,'https://tawcauhcogjnthocdhce.supabase.co/storage/v1/object/public/anime-images/covers/4.jpg');
INSERT INTO storage.objects VALUES ('anime-images','covers/1.jpg'),('anime-images','covers/3.jpg'),('anime-images','covers/3.png'),('anime-images','covers/4.jpg');
\ir ../../scripts/sql/reconcile-anime-images.sql
DO $$ BEGIN
 IF (SELECT local_image_url FROM anime_catalog WHERE mal_id=1) NOT LIKE '%tawcauhcogjnthocdhce%/covers/1.jpg' THEN RAISE EXCEPTION 'FAIL: recuperação mal_id'; END IF;
 IF (SELECT count(*) FROM anime_image_url_repair_backup) <> 1 THEN RAISE EXCEPTION 'FAIL: backup'; END IF;
 IF (SELECT local_image_url FROM anime_catalog WHERE mal_id=2) NOT LIKE '%xhyairbedwqezegopjan%' THEN RAISE EXCEPTION 'FAIL: arquivo inexistente foi aplicado'; END IF;
 IF (SELECT local_image_url FROM anime_catalog WHERE mal_id=3) NOT LIKE '%xhyairbedwqezegopjan%' THEN RAISE EXCEPTION 'FAIL: arquivo ambíguo foi aplicado'; END IF;
 IF (SELECT local_image_url FROM anime_catalog WHERE mal_id=4) NOT LIKE '%tawcauhcogjnthocdhce%/covers/4.jpg' THEN RAISE EXCEPTION 'FAIL: origem válida alterada'; END IF;
END $$;
\ir ../../scripts/sql/reconcile-anime-images.sql
DO $$ BEGIN
 IF (SELECT count(*) FROM anime_image_url_repair_backup) <> 1 THEN RAISE EXCEPTION 'FAIL: repetição'; END IF;
END $$;
SELECT 'PASS: recuperação por ID, backup, arquivo ausente, ambiguidade, origem atual e repetição' result;
