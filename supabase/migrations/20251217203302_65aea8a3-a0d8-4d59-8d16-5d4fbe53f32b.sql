-- Criar política que permite ver perfis de usuários com relação de amizade (pendente ou aceita)
CREATE POLICY "Users can view profiles of friendship relations"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Pode ver próprio perfil
    auth.uid() = id
    -- Ou perfis públicos
    OR is_public = true
    -- Ou perfis de pessoas com quem tem amizade (aceita ou pendente)
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE (
        (f.requester_id = auth.uid() AND f.addressee_id = profiles.id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.id)
      )
      AND f.status IN ('pending', 'accepted')
    )
  )
);

-- Remover política antiga se existir (para evitar conflitos)
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;