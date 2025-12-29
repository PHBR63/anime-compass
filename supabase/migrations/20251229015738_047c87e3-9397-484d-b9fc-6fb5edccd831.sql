-- Tabela para armazenar subscriptions de Web Push
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Índice para buscar subscriptions por usuário
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para usuários gerenciarem suas próprias subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.push_subscriptions IS 'Armazena subscriptions de Web Push para notificações';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'URL do endpoint de push do navegador';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'Chave pública para criptografia';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Secret de autenticação';