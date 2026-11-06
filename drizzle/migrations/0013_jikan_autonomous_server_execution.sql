-- lovable-cron-fallback-reviewed: wake-on-enqueue; recovery only while work is active; unschedule after pause, completion or permanent failure; maximum 1440 checks/day, one-minute runtime recovery
CREATE TABLE public.jikan_server_run (
 id text PRIMARY KEY CHECK (id='jikan_import'), mode text NOT NULL CHECK(mode IN ('full','season')),
 status text NOT NULL CHECK(status IN ('queued','working','waiting','paused','completed','failed')),
 requested_by uuid REFERENCES public.profiles(id), pause_requested boolean NOT NULL DEFAULT false,
 attempt integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid, lease_until timestamptz, last_error text, started_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
GRANT SELECT ON public.jikan_server_run TO authenticated;
GRANT ALL ON public.jikan_server_run TO service_role;
ALTER TABLE public.jikan_server_run ENABLE ROW LEVEL SECURITY;
CREATE POLICY jikan_server_admin_read ON public.jikan_server_run FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
-- Reutiliza internamente o comando protegido existente sem devolver credenciais.
CREATE OR REPLACE FUNCTION public.jikan_server_schedule(p_active boolean,p_wake boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cmd text; jid bigint;
BEGIN
 SELECT jobid INTO jid FROM cron.job WHERE jobname='jikan-server-recovery';
 IF NOT p_active THEN IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF; RETURN; END IF;
 SELECT replace(command,'/import-jikan','/jikan-worker') INTO cmd FROM cron.job WHERE jobname='jikan-import-daily' AND active;
 IF cmd IS NULL OR position('/jikan-worker' IN cmd)=0 THEN RAISE EXCEPTION 'Agendamento diário protegido indisponível'; END IF;
 IF jid IS NULL THEN PERFORM cron.schedule('jikan-server-recovery','* * * * *',cmd); END IF;
 IF p_wake THEN EXECUTE cmd; END IF;
END $$;
REVOKE ALL ON FUNCTION public.jikan_server_schedule(boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jikan_server_schedule(boolean,boolean) TO service_role;
-- Comandos explícitos serializados com o checkpoint preservado.
CREATE OR REPLACE FUNCTION public.jikan_server_command(p_action text,p_mode text,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sync_state%ROWTYPE; r public.jikan_server_run%ROWTYPE;
BEGIN
 IF NOT public.has_role(p_user_id,'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE='42501'; END IF;
 IF p_action NOT IN ('start','resume','pause') OR p_mode NOT IN ('full','season') THEN RAISE EXCEPTION 'Parâmetros inválidos'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('jikan_server_control'));
 SELECT * INTO s FROM public.sync_state WHERE id='jikan_import' FOR UPDATE;
 SELECT * INTO r FROM public.jikan_server_run WHERE id='jikan_import' FOR UPDATE;
 IF p_action='pause' THEN
 IF r.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','A execução atual não é autônoma; use a tela que a iniciou.'); END IF;
 UPDATE public.jikan_server_run SET pause_requested=true,status=CASE WHEN status='working' AND lease_until>now() THEN 'working' ELSE 'paused' END,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 PERFORM public.jikan_server_schedule(false);
 RETURN jsonb_build_object('success',true,'run',to_jsonb(r)); END IF;
 IF r.status IN ('queued','working','waiting') THEN RETURN jsonb_build_object('success',true,'run',to_jsonb(r)); END IF;
 IF s.is_running AND s.updated_at>now()-interval '5 minutes' THEN RETURN jsonb_build_object('success',false,'error','Uma página anterior está em andamento; aguarde sua conclusão.'); END IF;
 IF coalesce(s.current_page,0)>0 AND (s.max_page IS NULL OR s.current_page<s.max_page) AND s.mode<>p_mode THEN RETURN jsonb_build_object('success',false,'error','Retome o modo do checkpoint atual antes de iniciar outro catálogo.'); END IF;
 IF p_action='start' AND s.max_page IS NOT NULL AND s.current_page>=s.max_page THEN UPDATE public.sync_state SET current_page=0,total_synced=0,max_page=null,last_error=null,mode=p_mode,is_running=false WHERE id='jikan_import'; END IF;
 INSERT INTO public.jikan_server_run(id,mode,status,requested_by) VALUES('jikan_import',p_mode,'queued',p_user_id)
 ON CONFLICT(id) DO UPDATE SET mode=excluded.mode,status='queued',requested_by=p_user_id,pause_requested=false,attempt=0,next_attempt_at=now(),lease_id=null,lease_until=null,last_error=null,finished_at=null,updated_at=now();
 PERFORM public.jikan_server_schedule(true,true);
 SELECT * INTO r FROM public.jikan_server_run WHERE id='jikan_import';
 RETURN jsonb_build_object('success',true,'run',to_jsonb(r));
END $$;
REVOKE ALL ON FUNCTION public.jikan_server_command(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jikan_server_command(text,text,uuid) TO service_role;
-- Aquisição idempotente com concessão recuperável.
CREATE OR REPLACE FUNCTION public.jikan_server_claim()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.jikan_server_run%ROWTYPE; s public.sync_state%ROWTYPE; page_ integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('jikan_server_control'));
 SELECT * INTO r FROM public.jikan_server_run WHERE id='jikan_import' FOR UPDATE;
 IF r.id IS NULL OR r.status IN ('paused','completed','failed') THEN PERFORM public.jikan_server_schedule(false); RETURN NULL; END IF;
 IF r.status='working' AND r.lease_until>now() THEN RETURN NULL; END IF;
 IF r.pause_requested THEN UPDATE public.jikan_server_run SET status='paused',updated_at=now() WHERE id=r.id; PERFORM public.jikan_server_schedule(false); RETURN NULL; END IF;
 IF r.next_attempt_at>now() THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.sync_state WHERE id='jikan_import' FOR UPDATE;
 IF s.is_running AND s.updated_at>now()-interval '5 minutes' THEN RETURN NULL; END IF;
 IF s.mode<>r.mode AND s.current_page>0 THEN UPDATE public.jikan_server_run SET status='failed',last_error='Modo do checkpoint alterado por outra execução',updated_at=now() WHERE id=r.id; PERFORM public.jikan_server_schedule(false); RETURN NULL; END IF;
 IF s.max_page IS NOT NULL AND s.current_page>=s.max_page THEN UPDATE public.jikan_server_run SET status='completed',finished_at=now(),updated_at=now() WHERE id=r.id; PERFORM public.jikan_server_schedule(false); RETURN NULL; END IF;
 page_:=coalesce(s.current_page,0)+1;
 UPDATE public.jikan_server_run SET status='working',lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now() WHERE id=r.id RETURNING * INTO r;
 RETURN jsonb_build_object('lease',r.lease_id,'mode',r.mode,'page',page_,'attempt',r.attempt,'requested_by',r.requested_by);
END $$;
REVOKE ALL ON FUNCTION public.jikan_server_claim() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jikan_server_claim() TO service_role;
-- Reconcilia respostas perdidas sem avançar em falhas nem aceitar executor antigo.
CREATE OR REPLACE FUNCTION public.jikan_server_finish(p_lease uuid,p_page integer,p_retryable boolean,p_error text,p_wait_ms bigint DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.jikan_server_run%ROWTYPE; s public.sync_state%ROWTYPE; ok_ boolean; delay_ bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('jikan_server_control'));
 SELECT * INTO r FROM public.jikan_server_run WHERE id='jikan_import' FOR UPDATE;
 IF r.lease_id IS DISTINCT FROM p_lease OR r.status<>'working' THEN RETURN jsonb_build_object('stale',true); END IF;
 SELECT * INTO s FROM public.sync_state WHERE id='jikan_import';
 ok_:=s.mode=r.mode AND s.current_page>=p_page;
 delay_:=greatest(least(5000*power(2,least(r.attempt,6))::bigint,300000),greatest(0,coalesce(p_wait_ms,0)));
 UPDATE public.jikan_server_run SET status=CASE WHEN r.pause_requested THEN 'paused' WHEN ok_ AND s.max_page IS NOT NULL AND s.current_page>=s.max_page THEN 'completed' WHEN ok_ THEN 'queued' WHEN p_retryable THEN 'waiting' ELSE 'failed' END,
 attempt=CASE WHEN ok_ THEN 0 ELSE r.attempt+1 END,last_error=CASE WHEN ok_ THEN null ELSE left(p_error,1000) END,
 next_attempt_at=now()+CASE WHEN ok_ THEN interval '3 seconds' ELSE delay_*interval '1 millisecond' END,
 lease_id=null,lease_until=null,updated_at=now(),finished_at=CASE WHEN ok_ AND s.max_page IS NOT NULL AND s.current_page>=s.max_page THEN now() ELSE null END
 WHERE id=r.id RETURNING * INTO r;
 PERFORM public.jikan_server_schedule(r.status IN ('queued','waiting'));
 RETURN jsonb_build_object('status',r.status,'next_attempt_at',r.next_attempt_at);
END $$;
REVOKE ALL ON FUNCTION public.jikan_server_finish(uuid,integer,boolean,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jikan_server_finish(uuid,integer,boolean,text,bigint) TO service_role;