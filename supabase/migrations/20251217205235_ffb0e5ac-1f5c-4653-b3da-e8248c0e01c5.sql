-- Atualizar política de list_items para permitir acesso a listas públicas
-- sem exigir que o perfil do dono seja público
DROP POLICY IF EXISTS "Users can view list items with privacy check" ON public.list_items;

CREATE POLICY "Users can view list items of public or own lists" 
ON public.list_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM custom_lists cl 
    WHERE cl.id = list_items.list_id 
    AND (cl.user_id = auth.uid() OR cl.is_public = true)
  )
);

-- Adicionar política para anime_entries permitir visualização
-- quando o anime faz parte de uma lista pública
CREATE POLICY "Anyone can view anime entries in public lists" 
ON public.anime_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM list_items li
    JOIN custom_lists cl ON cl.id = li.list_id
    WHERE li.anime_entry_id = anime_entries.id
    AND cl.is_public = true
  )
);