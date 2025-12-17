-- Corrigir política RLS de visualização de conversas (estava com bug)
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

CREATE POLICY "Users can view their conversations" 
ON conversations 
FOR SELECT 
USING (
  (created_by = auth.uid()) 
  OR 
  (EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
  ))
);

-- Corrigir política de delete também
DROP POLICY IF EXISTS "Admins can delete group conversations" ON conversations;

CREATE POLICY "Admins can delete group conversations" 
ON conversations 
FOR DELETE 
USING (
  (type = 'group') 
  AND (EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid() 
    AND cp.role = 'admin'
  ))
);