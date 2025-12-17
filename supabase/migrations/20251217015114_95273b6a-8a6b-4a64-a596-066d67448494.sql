-- Remover política de INSERT existente
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Criar política de INSERT que permite usuários autenticados criar conversas
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Garantir que a política de SELECT também está correta para novos registros
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view their conversations" 
ON public.conversations 
FOR SELECT 
TO authenticated
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = id AND user_id = auth.uid()
  )
);