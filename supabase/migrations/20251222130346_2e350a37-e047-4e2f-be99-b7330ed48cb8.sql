-- ============================================
-- CORREÇÃO DE SEGURANÇA: Exposição de Dados de Usuários
-- ============================================

-- ======================
-- PROBLEMA 1: anime_entries exposta para usuários anônimos
-- Solução: Remover policies que permitem acesso anônimo e garantir
-- que apenas usuários autenticados em contextos válidos vejam os dados
-- ======================

-- Remove policies problemáticas de acesso anônimo
DROP POLICY IF EXISTS "Public list anime entries viewable by anon" ON public.anime_entries;
DROP POLICY IF EXISTS "anon_view_public_list_entries" ON public.anime_entries;

-- Atualiza a policy de listas públicas para exigir autenticação
-- Mesmo listas públicas só podem ser vistas por usuários autenticados
DROP POLICY IF EXISTS "Public list anime entries viewable by authenticated" ON public.anime_entries;

CREATE POLICY "Authenticated can view public list entries"
ON public.anime_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.list_items li
    JOIN public.custom_lists cl ON cl.id = li.list_id
    WHERE li.anime_entry_id = anime_entries.id 
    AND cl.is_public = true
  )
);

-- ======================
-- PROBLEMA 2: Perfis privados visíveis para todos os usuários logados
-- Solução: Respeitar a flag is_public e permitir que:
-- - Usuário veja seu próprio perfil
-- - Usuários vejam perfis públicos
-- - Amigos vejam perfis de amigos (para funcionalidades sociais)
-- ======================

-- Remove a policy problemática
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Cria função security definer para verificar amizade (evita recursão)
CREATE OR REPLACE FUNCTION public.is_friend_with(_user_id uuid, _friend_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = _user_id AND addressee_id = _friend_id)
      OR (addressee_id = _user_id AND requester_id = _friend_id)
    )
  )
$$;

-- Cria nova policy que respeita privacidade
CREATE POLICY "Users can view profiles respecting privacy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Próprio perfil
  auth.uid() = id
  -- OU perfil é público
  OR is_public = true
  -- OU são amigos
  OR public.is_friend_with(auth.uid(), id)
);

-- Policy para usuários anônimos verem apenas perfis públicos (para páginas /u/:username)
CREATE POLICY "Anon can view public profiles only"
ON public.profiles
FOR SELECT
TO anon
USING (is_public = true);

-- ======================
-- CORREÇÃO ADICIONAL: list_items para usuários anônimos
-- Apenas autenticados podem ver itens de listas públicas
-- ======================

DROP POLICY IF EXISTS "Anon can view public list items" ON public.list_items;

-- Mantém acesso anônimo APENAS para visualização de listas públicas compartilhadas
-- Isso é necessário para a funcionalidade de compartilhamento de listas
CREATE POLICY "Anon can view public list items limited"
ON public.list_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.custom_lists cl
    WHERE cl.id = list_items.list_id 
    AND cl.is_public = true
  )
);

-- ======================
-- ATUALIZAÇÃO: custom_lists para respeitar autenticação
-- ======================

-- A policy existente "Anon can view public lists" é mantida
-- pois é necessária para compartilhamento de listas públicas

-- ======================
-- ADICIONA: Policy para admins verem todos os perfis (para gestão)
-- ======================

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ======================
-- COMENTÁRIO: Garantir consistência nas policies
-- ======================

-- Atualiza função has_role para garantir que está funcionando
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;