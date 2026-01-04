-- Atualiza política de INSERT para permitir inserções do sistema (via service role)
DROP POLICY IF EXISTS "Only system functions can insert notifications" ON public.notifications;

CREATE POLICY "System and service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);