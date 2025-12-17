-- Remover políticas existentes de SELECT para profiles
DROP POLICY IF EXISTS "Users can view profiles of friendship relations" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Criar política que permite todos os usuários autenticados verem perfis
-- Isso é necessário para que a busca de amigos funcione
-- A privacidade será controlada no nível da aplicação (ocultar bio, animes, etc)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);