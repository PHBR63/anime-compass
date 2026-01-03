-- Criar bucket para imagens de animes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anime-images', 
  'anime-images', 
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública
CREATE POLICY "Anime images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'anime-images');

-- Política de escrita apenas para admins (via service role)
CREATE POLICY "Only admins can upload anime images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'anime-images' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Política de atualização para admins
CREATE POLICY "Only admins can update anime images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'anime-images'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Política de exclusão para admins
CREATE POLICY "Only admins can delete anime images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'anime-images'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);