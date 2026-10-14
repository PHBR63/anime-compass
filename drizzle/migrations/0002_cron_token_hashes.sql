-- Guarda apenas o hash das senhas de agendamento; acessível somente pelo servidor.
CREATE TABLE public.cron_token_hashes (
  name text PRIMARY KEY,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cron_token_hashes TO service_role;
ALTER TABLE public.cron_token_hashes ENABLE ROW LEVEL SECURITY;