-- Adicionar campos para fixar conversas na tabela conversation_participants
ALTER TABLE public.conversation_participants 
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone DEFAULT NULL;

-- Criar índice para otimizar ordenação
CREATE INDEX IF NOT EXISTS idx_conversation_participants_pinned 
ON public.conversation_participants (user_id, is_pinned DESC, pinned_at DESC NULLS LAST);