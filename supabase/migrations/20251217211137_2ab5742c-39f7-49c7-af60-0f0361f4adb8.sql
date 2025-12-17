-- 1. Remover a FK atual que aponta para auth.users
ALTER TABLE public.custom_lists
DROP CONSTRAINT IF EXISTS custom_lists_user_id_fkey;

-- 2. Criar nova FK apontando para profiles.id
ALTER TABLE public.custom_lists
ADD CONSTRAINT custom_lists_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;