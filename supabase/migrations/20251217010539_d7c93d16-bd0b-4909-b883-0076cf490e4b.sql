-- Tabela de reações em mensagens do chat
CREATE TABLE public.chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'heart', 'fire', 'laugh', 'sad', 'wow')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Habilitar RLS
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies para reações
CREATE POLICY "Users can view reactions in their conversations"
ON public.chat_message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id
    AND public.is_conversation_participant(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.chat_message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id
    AND public.is_conversation_participant(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.chat_message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX idx_chat_message_reactions_message ON public.chat_message_reactions(message_id);