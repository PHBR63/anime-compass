-- Remover constraint antigo de message_type
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

-- Criar novo constraint incluindo list_card
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('text', 'anime_card', 'recommendation', 'image', 'system', 'list_card'));