-- Simplificar política de INSERT em conversations
-- Permitir qualquer usuário autenticado criar conversas

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);