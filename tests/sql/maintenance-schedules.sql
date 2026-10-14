\set ON_ERROR_STOP on
CREATE SCHEMA vault;
CREATE SCHEMA cron;
CREATE TABLE vault.decrypted_secrets (name text UNIQUE, decrypted_secret text);
CREATE FUNCTION vault.create_secret(secret text, name text, description text) RETURNS uuid
LANGUAGE plpgsql AS $$ BEGIN INSERT INTO vault.decrypted_secrets VALUES (name,secret); RETURN gen_random_uuid(); END $$;
CREATE TABLE cron.job (jobid bigint,jobname text,schedule text,command text);
INSERT INTO cron.job VALUES (4,'cleanup-old-logs-daily','0 3 * * *','legacy'),(5,'sync-airing-episodes-daily','0 4 * * *','legacy');
CREATE FUNCTION cron.alter_job(job_id bigint, schedule text DEFAULT NULL, command text DEFAULT NULL, database text DEFAULT NULL, username text DEFAULT NULL, active boolean DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$ UPDATE cron.job SET command=alter_job.command WHERE jobid=job_id $$;
\ir ../../supabase/migrations/20261014030100_secure_maintenance_schedules.sql
DO $$ BEGIN
 IF (SELECT count(*) FROM public.cron_token_hashes) <> 2 THEN RAISE EXCEPTION 'FAIL: hashes ausentes'; END IF;
 IF EXISTS(
  SELECT 1 FROM public.cron_token_hashes h JOIN vault.decrypted_secrets s ON s.name='anicheck_'||h.name
  WHERE h.token_hash <> encode(sha256(convert_to(s.decrypted_secret,'UTF8')),'hex')
 ) THEN RAISE EXCEPTION 'FAIL: hash divergente'; END IF;
 IF EXISTS(SELECT 1 FROM cron.job WHERE command NOT LIKE '%vault.decrypted_secrets%' OR command NOT LIKE '%x-cron-token%') THEN
  RAISE EXCEPTION 'FAIL: agendamento sem autenticação segura';
 END IF;
 IF (SELECT schedule FROM cron.job WHERE jobid=4) <> '0 3 * * *' OR (SELECT schedule FROM cron.job WHERE jobid=5) <> '0 4 * * *' THEN
  RAISE EXCEPTION 'FAIL: frequência alterada';
 END IF;
END $$;
-- Repetição preserva o token existente e não cria segredo duplicado.
\ir ../../supabase/migrations/20261014030100_secure_maintenance_schedules.sql
DO $$ BEGIN
 IF (SELECT count(*) FROM vault.decrypted_secrets) <> 2 THEN RAISE EXCEPTION 'FAIL: token recriado'; END IF;
 IF has_table_privilege('authenticated','public.cron_token_hashes','SELECT') THEN RAISE EXCEPTION 'FAIL: hash exposto'; END IF;
END $$;
SELECT 'PASS: tokens separados, hashes corretos, frequência preservada e migração repetível' result;
