-- Pausa em execução mantém recuperação somente até a concessão terminar/expirar.
CREATE OR REPLACE FUNCTION public.jikan_server_command(p_action text,p_mode text,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sync_state%ROWTYPE; r public.jikan_server_run%ROWTYPE;
BEGIN
 IF p_user_id IS NULL OR NOT public.has_role(p_user_id,'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_mode IS NULL OR p_action NOT IN ('start','resume','pause') OR p_mode NOT IN ('full','season') THEN RAISE EXCEPTION 'Parâmetros inválidos'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('jikan_server_control'));
 SELECT * INTO s FROM public.sync_state WHERE id='jikan_import' FOR UPDATE;
 SELECT * INTO r FROM public.jikan_server_run WHERE id='jikan_import' FOR UPDATE;
 IF p_action='pause' THEN
 IF r.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','A execução atual não é autônoma; use a tela que a iniciou.'); END IF;
 UPDATE public.jikan_server_run SET pause_requested=true,status=CASE WHEN status='working' AND lease_until>now() THEN 'working' ELSE 'paused' END,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 PERFORM public.jikan_server_schedule(r.status='working');
 RETURN jsonb_build_object('success',true,'run',to_jsonb(r)); END IF;
 IF r.status IN ('queued','working','waiting') THEN RETURN jsonb_build_object('success',true,'run',to_jsonb(r)); END IF;
 IF s.is_running AND s.updated_at>now()-interval '5 minutes' THEN RETURN jsonb_build_object('success',false,'error','Uma página anterior está em andamento; aguarde sua conclusão.'); END IF;
 IF coalesce(s.current_page,0)>0 AND (s.max_page IS NULL OR s.current_page<s.max_page) AND s.mode<>p_mode THEN RETURN jsonb_build_object('success',false,'error','Retome o modo do checkpoint atual antes de iniciar outro catálogo.'); END IF;
 IF p_action='start' AND s.max_page IS NOT NULL AND s.current_page>=s.max_page THEN UPDATE public.sync_state SET current_page=0,total_synced=0,max_page=null,last_error=null,mode=p_mode,is_running=false WHERE id='jikan_import'; END IF;
 INSERT INTO public.jikan_server_run(id,mode,status,requested_by) VALUES('jikan_import',p_mode,'queued',p_user_id)
 ON CONFLICT(id) DO UPDATE SET mode=excluded.mode,status='queued',requested_by=p_user_id,pause_requested=false,attempt=0,next_attempt_at=now(),lease_id=null,lease_until=null,last_error=null,finished_at=null,started_at=now(),updated_at=now();
 PERFORM public.jikan_server_schedule(true,true);
 SELECT * INTO r FROM public.jikan_server_run WHERE id='jikan_import';
 RETURN jsonb_build_object('success',true,'run',to_jsonb(r));
END $$;
REVOKE ALL ON FUNCTION public.jikan_server_command(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jikan_server_command(text,text,uuid) TO service_role;