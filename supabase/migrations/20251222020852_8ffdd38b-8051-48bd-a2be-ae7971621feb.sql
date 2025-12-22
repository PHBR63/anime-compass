-- =============================================
-- Correção: Validação robusta para bucket de avatars
-- =============================================

-- 1. Remover políticas existentes para recriar com validação
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 2. Recriar política de DELETE com validação correta
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);