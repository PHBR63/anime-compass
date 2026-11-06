-- Reinício legado deve disputar o mesmo bloqueio; não modifica o checkpoint durante a instalação.
CREATE OR REPLACE FUNCTION public.jikan_reset_checkpoint(p_updated_at timestamptz)
RETURNS TABLE(id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sync_state%ROWTYPE; r public.jikan_server_run%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('jikan_server_control'));
 SELECT * INTO s FROM public.sync_state WHERE sync_state.id='jikan_import' FOR UPDATE;
 SELECT * INTO r FROM public.jikan_server_run WHERE jikan_server_run.id='jikan_import' FOR UPDATE;
 IF s.updated_at IS DISTINCT FROM p_updated_at OR (s.is_running AND s.updated_at>now()-interval '5 minutes') OR r.status IN ('queued','working','waiting') THEN RETURN; END IF;
 RETURN QUERY UPDATE public.sync_state SET current_page=0,total_synced=0,max_page=null,is_running=false,last_error=null WHERE sync_state.id='jikan_import' RETURNING sync_state.id;
END $$;
REVOKE ALL ON FUNCTION public.jikan_reset_checkpoint(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jikan_reset_checkpoint(timestamptz) TO service_role;