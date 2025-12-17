-- Remover política problemática existente
DROP POLICY IF EXISTS "Anyone can view anime entries in public lists" ON public.anime_entries;

-- Criar política simplificada para authenticated
CREATE POLICY "Public list anime entries viewable by authenticated"
ON public.anime_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM custom_lists cl
    INNER JOIN list_items li ON li.list_id = cl.id
    WHERE li.anime_entry_id = anime_entries.id
    AND cl.is_public = true
  )
);

-- Criar política para acesso anônimo em anime_entries
CREATE POLICY "Public list anime entries viewable by anon"
ON public.anime_entries
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM custom_lists cl
    INNER JOIN list_items li ON li.list_id = cl.id
    WHERE li.anime_entry_id = anime_entries.id
    AND cl.is_public = true
  )
);

-- Adicionar política para acesso anônimo em list_items
CREATE POLICY "Anon can view public list items"
ON public.list_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM custom_lists cl
    WHERE cl.id = list_items.list_id
    AND cl.is_public = true
  )
);

-- Garantir que usuários anônimos possam ver listas públicas
CREATE POLICY "Anon can view public lists"
ON public.custom_lists
FOR SELECT
TO anon
USING (is_public = true);

-- Permitir que usuários anônimos vejam perfis de donos de listas públicas
CREATE POLICY "Anon can view profiles of public list owners"
ON public.profiles
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM custom_lists cl
    WHERE cl.user_id = profiles.id
    AND cl.is_public = true
  )
);

-- Índices para otimizar as consultas de listas públicas
CREATE INDEX IF NOT EXISTS idx_custom_lists_is_public 
ON custom_lists(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_list_items_list_id 
ON list_items(list_id);

CREATE INDEX IF NOT EXISTS idx_list_items_anime_entry_id 
ON list_items(anime_entry_id);