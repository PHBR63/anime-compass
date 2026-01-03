-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Atualizar política de delete para error_logs (permitir service role)
DROP POLICY IF EXISTS "Service role can delete old error logs" ON public.error_logs;
CREATE POLICY "Service role can delete old error logs" 
ON public.error_logs 
FOR DELETE 
USING (true);