-- 1. Corrigir profiles - exigir autenticação para ver perfis públicos
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    (is_public = true) OR (auth.uid() = id)
  )
);

-- 2. Corrigir achievements - exigir autenticação
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements;
CREATE POLICY "Achievements are viewable by authenticated users" 
ON public.achievements 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Corrigir user_achievements - exigir autenticação e restringir a amigos
DROP POLICY IF EXISTS "User achievements are viewable by everyone" ON public.user_achievements;
CREATE POLICY "User achievements are viewable by authenticated users" 
ON public.user_achievements 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM friendships f 
      WHERE f.status = 'accepted' 
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = user_achievements.user_id) 
        OR (f.addressee_id = auth.uid() AND f.requester_id = user_achievements.user_id)
      )
    )
  )
);

-- 4. Corrigir reviews - exigir autenticação
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by authenticated users" 
ON public.reviews 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 5. Corrigir review_reactions - exigir autenticação
DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.review_reactions;
CREATE POLICY "Reactions are viewable by authenticated users" 
ON public.review_reactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 6. Corrigir activity_reactions - exigir autenticação
DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.activity_reactions;
CREATE POLICY "Reactions are viewable by authenticated users" 
ON public.activity_reactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);