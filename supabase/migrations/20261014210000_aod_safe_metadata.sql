-- Complemento 2026-27: auditoria privada e atualização atômica somente de vazios.
BEGIN;
CREATE TABLE IF NOT EXISTS public.aod_metadata_audit (
  mal_id integer NOT NULL REFERENCES public.anime_catalog(mal_id),
  source_version text NOT NULL DEFAULT '2026-27',
  fields text[] NOT NULL,
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mal_id, source_version)
);
ALTER TABLE public.aod_metadata_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aod_metadata_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.aod_metadata_audit TO service_role;

-- Recebe lote preparado por ID, devolve contagens e nunca aceita gêneros/tags.
CREATE OR REPLACE FUNCTION public.apply_aod_metadata(p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item jsonb; patch jsonb; r public.anime_catalog%ROWTYPE;
  changed text[]; before_ jsonb; after_ jsonb; provenance jsonb;
  yr integer; total integer := 0; fields_count jsonb := '{}'::jsonb; field_ text;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION 'lote_invalido' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    patch := item->'fields';
    IF jsonb_typeof(patch) <> 'object' OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(patch) k WHERE k NOT IN ('type','season','season_year','year','studios')
    ) THEN RAISE EXCEPTION 'campo_nao_permitido' USING ERRCODE='22023'; END IF;
    SELECT * INTO r FROM public.anime_catalog WHERE mal_id=(item->>'mal_id')::integer FOR UPDATE;
    IF NOT FOUND OR EXISTS (SELECT 1 FROM aod_metadata_audit WHERE mal_id=r.mal_id AND source_version='2026-27') THEN CONTINUE; END IF;
    before_ := jsonb_build_object('type',r.type,'season',r.season,'year',r.year,'studios',r.studios);
    changed := ARRAY[]::text[]; provenance := '{}'::jsonb;
    yr := nullif(patch->>'season_year','')::integer;
    IF r.type IS NULL AND patch->>'type' IN ('TV','Movie','ONA','OVA','Special') THEN
      r.type:=patch->>'type'; changed:=array_append(changed,'type');
    END IF;
    IF r.season IS NULL AND patch->>'season' IN ('winter','spring','summer','fall')
      AND yr BETWEEN 1900 AND 2100 AND (r.year IS NULL OR r.year=yr) THEN
      r.season:=patch->>'season'; changed:=array_append(changed,'season');
      IF r.year IS NULL THEN r.year:=yr; changed:=array_append(changed,'year'); END IF;
    END IF;
    IF (r.studios IS NULL OR r.studios='[]'::jsonb) AND jsonb_typeof(patch->'studios')='array'
      AND jsonb_array_length(patch->'studios') > 0 THEN
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(patch->'studios') s WHERE nullif(btrim(s->>'name'),'') IS NULL) THEN
        RAISE EXCEPTION 'estudio_invalido' USING ERRCODE='22023';
      END IF;
      r.studios:=patch->'studios'; changed:=array_append(changed,'studios');
    END IF;
    IF cardinality(changed)=0 THEN CONTINUE; END IF;
    FOREACH field_ IN ARRAY changed LOOP
      provenance:=provenance || jsonb_build_object(field_,'anime_offline_database_2026-27');
      fields_count:=jsonb_set(fields_count,ARRAY[field_],to_jsonb(coalesce((fields_count->>field_)::integer,0)+1));
    END LOOP;
    UPDATE public.anime_catalog SET type=r.type,season=r.season,year=r.year,studios=r.studios,
      metadata_sources=coalesce(metadata_sources,'{}'::jsonb)||provenance,updated_at=now()
    WHERE mal_id=r.mal_id;
    after_:=jsonb_build_object('type',r.type,'season',r.season,'year',r.year,'studios',r.studios);
    INSERT INTO aod_metadata_audit(mal_id,fields,before_values,after_values) VALUES(r.mal_id,changed,before_,after_);
    total:=total+1;
  END LOOP;
  RETURN jsonb_build_object('titles',total,'fields',fields_count);
END $$;
REVOKE ALL ON FUNCTION public.apply_aod_metadata(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_aod_metadata(jsonb) TO service_role;
COMMIT;
