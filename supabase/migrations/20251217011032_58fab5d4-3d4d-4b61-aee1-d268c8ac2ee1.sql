-- Corrigir política de INSERT na tabela conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Também permitir que usuários atualizem conversas diretas das quais participam
DROP POLICY IF EXISTS "Admins can update group conversations" ON public.conversations;

CREATE POLICY "Users can update their conversations"
ON public.conversations FOR UPDATE
USING (
  public.is_conversation_participant(auth.uid(), id)
);