-- Corrigir política INSERT em conversation_participants
-- O problema era a comparação incorreta: conversation_participants_1.conversation_id = conversation_participants_1.conversation_id

DROP POLICY IF EXISTS "Conversation creators can add participants" ON conversation_participants;

-- Nova política: permite usuário adicionar a si mesmo OU admin adicionar outros
CREATE POLICY "Users can add participants"
ON conversation_participants FOR INSERT
TO public
WITH CHECK (
  -- Usuário pode adicionar a si mesmo em qualquer conversa
  (auth.uid() = user_id)
  OR
  -- OU é admin da conversa e pode adicionar outros
  (EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
  ))
);