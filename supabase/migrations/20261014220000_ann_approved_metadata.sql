-- Complemento ANN aprovado: somente gêneros/estúdios vazios e auditoria privada.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ann_metadata_audit (
  mal_id integer PRIMARY KEY REFERENCES public.anime_catalog(mal_id),
  ann_id integer NOT NULL CHECK (ann_id > 0),
  fields text[] NOT NULL,
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ann_metadata_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ann_metadata_audit FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.ann_metadata_audit TO service_role;

-- O lote é preparado com Genres/Animation Production verificados, nunca Themes/Production.
CREATE OR REPLACE FUNCTION public.apply_ann_metadata(p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; patch jsonb; r public.anime_catalog%ROWTYPE; before_ jsonb;
  changed text[]; origin jsonb; field_ text; ann_id_ integer;
  total integer:=0; counts jsonb:='{}'::jsonb;
BEGIN
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)>228 THEN
    RAISE EXCEPTION 'lote_invalido' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    ann_id_:=(item->>'ann_id')::integer; patch:=item->'fields';
    IF ann_id_ IS NULL OR ann_id_<=0 OR jsonb_typeof(patch)<>'object' OR EXISTS(
      SELECT 1 FROM jsonb_object_keys(patch) k WHERE k NOT IN ('genres','studios')
    ) THEN RAISE EXCEPTION 'metadados_invalidos' USING ERRCODE='22023'; END IF;
    SELECT * INTO r FROM anime_catalog WHERE mal_id=(item->>'mal_id')::integer FOR UPDATE;
    IF NOT FOUND OR EXISTS(SELECT 1 FROM ann_metadata_audit WHERE mal_id=r.mal_id) THEN CONTINUE; END IF;
    before_:=jsonb_build_object('genres',r.genres,'studios',r.studios);
    changed:=ARRAY[]::text[]; origin:='{}'::jsonb;
    FOREACH field_ IN ARRAY ARRAY['genres','studios'] LOOP
      IF patch ? field_ THEN
        IF jsonb_typeof(patch->field_)<>'array' OR jsonb_array_length(patch->field_)=0 OR EXISTS(
          SELECT 1 FROM jsonb_array_elements(patch->field_) v WHERE nullif(btrim(v->>'name'),'') IS NULL
        ) THEN RAISE EXCEPTION 'lista_invalida' USING ERRCODE='22023'; END IF;
        IF (field_='genres' AND (r.genres IS NULL OR r.genres='[]')) OR
           (field_='studios' AND (r.studios IS NULL OR r.studios='[]')) THEN
          IF field_='genres' THEN r.genres:=patch->field_; ELSE r.studios:=patch->field_; END IF;
          changed:=array_append(changed,field_);
          origin:=origin||jsonb_build_object(field_,'anime_news_network');
          counts:=jsonb_set(counts,ARRAY[field_],to_jsonb(coalesce((counts->>field_)::integer,0)+1));
        END IF;
      END IF;
    END LOOP;
    IF cardinality(changed)=0 THEN CONTINUE; END IF;
    UPDATE anime_catalog SET genres=r.genres,studios=r.studios,
      metadata_sources=coalesce(metadata_sources,'{}')||origin||jsonb_build_object('ann',jsonb_build_object(
        'id',ann_id_,'url','https://www.animenewsnetwork.com/encyclopedia/anime.php?id='||ann_id_,
        'checked_at','2026-10-14')),updated_at=now() WHERE mal_id=r.mal_id;
    INSERT INTO ann_metadata_audit(mal_id,ann_id,fields,before_values,after_values)
      VALUES(r.mal_id,ann_id_,changed,before_,jsonb_build_object('genres',r.genres,'studios',r.studios));
    total:=total+1;
  END LOOP;
  RETURN jsonb_build_object('titles',total,'fields',counts);
END $$;
REVOKE ALL ON FUNCTION public.apply_ann_metadata(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_ann_metadata(jsonb) TO service_role;
COMMIT;
