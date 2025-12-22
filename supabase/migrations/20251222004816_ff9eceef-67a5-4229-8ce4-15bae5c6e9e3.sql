-- Remove a política que expõe dados de perfil para usuários anônimos
DROP POLICY IF EXISTS "Anon can view profiles of public list owners" ON public.profiles;

-- Criar função segura que retorna apenas dados mínimos para listas públicas
-- Usada apenas para exibir nome do criador em listas públicas
CREATE OR REPLACE FUNCTION public.get_public_list_owner_info(list_id uuid)
RETURNS TABLE (
  display_name text,
  username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(p.display_name, 'Usuário') as display_name,
    p.username
  FROM public.custom_lists cl
  JOIN public.profiles p ON p.id = cl.user_id
  WHERE cl.id = list_id 
    AND cl.is_public = true
  LIMIT 1;
$$;

-- Conceder permissão para anon executar a função
GRANT EXECUTE ON FUNCTION public.get_public_list_owner_info(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_list_owner_info(uuid) TO authenticated;