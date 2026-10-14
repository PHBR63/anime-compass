-- Mantém horários existentes e troca credenciais embutidas por tokens exclusivos no Vault.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cron_token_hashes (
  name text PRIMARY KEY, token_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cron_token_hashes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cron_token_hashes FROM anon, authenticated;
GRANT ALL ON public.cron_token_hashes TO service_role;

DO $$
DECLARE
  task record;
  token text;
  secret_name text;
  command_text text;
BEGIN
  FOR task IN
    SELECT * FROM (VALUES
      ('cleanup-old-logs-daily', 'cleanup-old-logs', 'cleanup_logs'),
      ('sync-airing-episodes-daily', 'sync-airing-episodes', 'sync_airing')
    ) AS tasks(job_name, function_name, token_name)
  LOOP
    secret_name := 'anicheck_' || task.token_name;
    SELECT decrypted_secret INTO token FROM vault.decrypted_secrets WHERE name = secret_name;
    IF token IS NULL THEN
      token := gen_random_uuid()::text || gen_random_uuid()::text;
      PERFORM vault.create_secret(token, secret_name, 'Token exclusivo do agendamento AniCheck');
    END IF;
    INSERT INTO public.cron_token_hashes(name, token_hash)
    VALUES (task.token_name, encode(sha256(convert_to(token, 'UTF8')), 'hex'))
    ON CONFLICT (name) DO UPDATE SET token_hash = EXCLUDED.token_hash;

    command_text := format(
      $cmd$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token',
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = %L)),
        body := '{}'::jsonb, timeout_milliseconds := 120000
      );$cmd$,
      'https://tawcauhcogjnthocdhce.supabase.co/functions/v1/' || task.function_name, secret_name
    );
    -- Não cria novos jobs nem muda a frequência; funções sem job continuam manuais.
    PERFORM cron.alter_job(job_id := jobid, command := command_text)
    FROM cron.job WHERE jobname = task.job_name;
  END LOOP;
END;
$$;
COMMIT;
