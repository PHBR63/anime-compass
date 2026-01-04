-- Remove animes do tipo Music, CM ou PV do catálogo (limpeza preventiva)
DELETE FROM public.anime_catalog 
WHERE type IN ('Music', 'CM', 'PV');