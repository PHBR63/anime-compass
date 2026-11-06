-- Aquisição de página no mesmo bloqueio dos comandos autônomos; chamadas antigas permanecem compatíveis.
CREATE OR REPLACE FUNCTION public.jikan_acquire_page(p_mode text,p_page integer,p_updated_at timestamptz,p_worker_lease uuid DEFAULT NULL)
RETURNS TABLE(id text,updated_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sync_state%ROWTYPE; r public.jikan_server_run%ROWTYPE;
BEGIN
 IF p_mode NOT IN ('full','season') OR p_page<1 OR p_page>100000 THEN RAISE EXCEPTION 'Parâmetros inválidos'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('jikan_server_control'));
 SELECT * INTO s FROM public.sync_state WHERE sync_state.id='jikan_import' FOR UPDATE;
 SELECT * INTO r FROM public.jikan_server_run WHERE jikan_server_run.id='jikan_import' FOR UPDATE;
 IF s.updated_at IS DISTINCT FROM p_updated_at OR (s.is_running AND s.updated_at>now()-interval '5 minutes') THEN RETURN; END IF;
 IF p_worker_lease IS NOT NULL THEN
   IF r.lease_id IS DISTINCT FROM p_worker_lease OR r.status<>'working' OR r.lease_until<=now() OR r.mode<>p_mode OR p_page<>coalesce(s.current_page,0)+1 THEN RETURN; END IF;
 ELSE
   IF r.status IN ('queued','working','waiting') THEN RETURN; END IF;
 END IF;
 RETURN QUERY UPDATE public.sync_state SET is_running=true,mode=p_mode,
 current_page=CASE WHEN p_page=1 OR s.mode<>p_mode THEN 0 ELSE s.current_page END,
 total_synced=CASE WHEN p_page=1 OR s.mode<>p_mode THEN 0 ELSE s.total_synced END,
 max_page=CASE WHEN p_page=1 OR s.mode<>p_mode THEN null ELSE s.max_page END
 WHERE sync_state.id='jikan_import' RETURNING sync_state.id,sync_state.updated_at;
END $$;
REVOKE ALL ON FUNCTION public.jikan_acquire_page(text,integer,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jikan_acquire_page(text,integer,timestamptz,uuid) TO service_role;