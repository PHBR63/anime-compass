-- Corrige concatenação de texto em array (usar array_append).
CREATE OR REPLACE FUNCTION public.apply_kitsu_metadata(p_mal_id int, p_genres jsonb, p_studios jsonb, p_season text, p_year int, p_result text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.anime_catalog%ROWTYPE;
  v_fill_g boolean; v_fill_s boolean; v_fill_season boolean; v_fill_year boolean;
  v_campos text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO r FROM public.anime_catalog WHERE mal_id = p_mal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  v_fill_g := (r.genres IS NULL OR r.genres = '[]'::jsonb) AND jsonb_typeof(p_genres) = 'array' AND jsonb_array_length(p_genres) > 0;
  v_fill_s := (r.studios IS NULL OR r.studios = '[]'::jsonb) AND jsonb_typeof(p_studios) = 'array' AND jsonb_array_length(p_studios) > 0;
  v_fill_year := r.year IS NULL AND p_year IS NOT NULL;
  v_fill_season := r.season IS NULL AND p_season IN ('winter','spring','summer','fall') AND (r.year IS NULL OR r.year = p_year);
  IF v_fill_g THEN v_campos := array_append(v_campos, 'genres'::text); END IF;
  IF v_fill_s THEN v_campos := array_append(v_campos, 'studios'::text); END IF;
  IF v_fill_year THEN v_campos := array_append(v_campos, 'year'::text); END IF;
  IF v_fill_season THEN v_campos := array_append(v_campos, 'season'::text); END IF;
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
REVOKE ALL ON FUNCTION public.apply_kitsu_metadata(int, jsonb, jsonb, text, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_kitsu_metadata(int, jsonb, jsonb, text, int, text) TO service_role;