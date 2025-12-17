-- 1. Alterar o valor padrão de is_public para false na tabela profiles
-- Isso garante que novos usuários terão perfis privados por padrão
ALTER TABLE public.profiles ALTER COLUMN is_public SET DEFAULT false;

-- 2. Remover a política atual de list_items que permite visualização pública
DROP POLICY IF EXISTS "Users can view list items of accessible lists" ON public.list_items;

-- 3. Criar nova política mais restritiva para list_items
-- Agora só permite ver itens se:
-- - O usuário é dono da lista, OU
-- - A lista é pública E o dono da lista tem perfil público
CREATE POLICY "Users can view list items with privacy check" 
ON public.list_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM custom_lists cl
    WHERE cl.id = list_items.list_id
    AND (
      -- Dono da lista sempre pode ver
      cl.user_id = auth.uid()
      OR
      -- Lista pública + perfil público do dono
      (
        cl.is_public = true 
        AND EXISTS (
          SELECT 1 FROM profiles p 
          WHERE p.id = cl.user_id 
          AND p.is_public = true
        )
      )
    )
  )
);

-- 4. Adicionar comentário explicativo nas tabelas
COMMENT ON COLUMN public.profiles.is_public IS 'Define se o perfil é público. Padrão: false (privado) para proteger dados do usuário.';
COMMENT ON COLUMN public.custom_lists.is_public IS 'Define se a lista é pública. Listas públicas só são visíveis se o perfil do dono também for público.';