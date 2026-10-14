-- Operação manual, separada do deploy. Revisar a contagem antes de autorizar.
-- Reconcilia somente a origem antiga conhecida e somente se existir uma única capa pelo MAL ID.
BEGIN;
CREATE TABLE IF NOT EXISTS public.anime_image_url_repair_backup (
  mal_id integer NOT NULL, old_url text NOT NULL, new_url text NOT NULL,
  repaired_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (mal_id, old_url, new_url)
);
ALTER TABLE public.anime_image_url_repair_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anime_image_url_repair_backup FROM anon, authenticated;
GRANT ALL ON public.anime_image_url_repair_backup TO service_role;

CREATE TEMP TABLE image_repair_candidates ON COMMIT DROP AS
SELECT a.mal_id, a.local_image_url AS old_url,
 'https://tawcauhcogjnthocdhce.supabase.co/storage/v1/object/public/anime-images/' || min(s.name) AS new_url
FROM public.anime_catalog a
JOIN storage.objects s ON s.bucket_id = 'anime-images'
 AND s.name IN ('covers/' || a.mal_id || '.jpg', 'covers/' || a.mal_id || '.png', 'covers/' || a.mal_id || '.webp')
WHERE a.local_image_url LIKE 'https://xhyairbedwqezegopjan.supabase.co/storage/v1/object/public/anime-images/%'
GROUP BY a.mal_id, a.local_image_url
HAVING count(*) = 1;

INSERT INTO public.anime_image_url_repair_backup(mal_id,old_url,new_url)
SELECT mal_id,old_url,new_url FROM image_repair_candidates
ON CONFLICT DO NOTHING;

-- Comparação com o valor anterior preserva qualquer correção concorrente.
UPDATE public.anime_catalog a SET local_image_url = c.new_url
FROM image_repair_candidates c WHERE a.mal_id = c.mal_id AND a.local_image_url = c.old_url;
SELECT count(*) AS reconciled_candidates FROM image_repair_candidates;
COMMIT;
