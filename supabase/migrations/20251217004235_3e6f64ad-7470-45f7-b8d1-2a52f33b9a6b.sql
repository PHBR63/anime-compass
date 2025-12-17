
-- Tabela de indicações de anime entre amigos
CREATE TABLE public.anime_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  mal_id INTEGER NOT NULL,
  anime_title TEXT NOT NULL,
  anime_image TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending', -- pending, accepted, watched
  created_at TIMESTAMPTZ DEFAULT now(),
  watched_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.anime_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for anime_recommendations
CREATE POLICY "Users can view their own recommendations"
ON public.anime_recommendations FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send recommendations"
ON public.anime_recommendations FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update received recommendations"
ON public.anime_recommendations FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their sent recommendations"
ON public.anime_recommendations FOR DELETE
USING (auth.uid() = from_user_id);

-- Tabela de reações em atividades
CREATE TABLE public.activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_entry_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anime_entry_id)
);

-- Enable RLS
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for activity_reactions
CREATE POLICY "Reactions are viewable by everyone"
ON public.activity_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own reactions"
ON public.activity_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.activity_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Inserir novas conquistas
INSERT INTO public.achievements (code, name, description, requirement_type, requirement_value, rarity, category, icon)
VALUES 
  ('perfect_score', 'Perfeccionista', 'Dê nota 10 para um anime', 'perfect_rating', 1, 'rare', 'special', '🌟'),
  ('long_review', 'Crítico Detalhista', 'Escreva uma review com mais de 500 caracteres', 'long_review', 1, 'uncommon', 'social', '📜'),
  ('streak_7', 'Dedicado', 'Assista anime por 7 dias seguidos', 'streak_days', 7, 'rare', 'progress', '🔥'),
  ('shounen_master', 'Shounen Warrior', 'Complete 10 animes de ação', 'genre_action', 10, 'rare', 'collection', '⚔️'),
  ('recommend_5', 'Bom Conselheiro', 'Tenha 5 indicações aceitas', 'recommendations_accepted', 5, 'epic', 'social', '💡'),
  ('influencer', 'Influenciador', 'Tenha 3 amigos assistindo algo que você indicou', 'recommendations_watched', 3, 'legendary', 'social', '🏆'),
  ('popular', 'Popular', 'Receba 50 likes em suas atividades', 'total_likes', 50, 'epic', 'social', '❤️'),
  ('binge_weekend', 'Maratonista', 'Assista 20+ episódios em um final de semana', 'weekend_episodes', 20, 'rare', 'progress', '📅'),
  ('early_adopter', 'Early Adopter', 'Esteja entre os primeiros 100 usuários', 'user_number', 100, 'legendary', 'special', '🚀'),
  ('secret_3am', '???', 'Descubra este segredo...', 'secret_3am', 1, 'legendary', 'special', '👻'),
  ('romance_expert', 'Romance Expert', 'Complete 10 animes de romance', 'genre_romance', 10, 'rare', 'collection', '💕'),
  ('horror_fan', 'Horror Fan', 'Complete 5 animes de terror', 'genre_horror', 5, 'rare', 'collection', '🎃'),
  ('critic_master', 'Mestre Crítico', 'Escreva 20 reviews', 'reviews_count', 20, 'epic', 'social', '✍️'),
  ('social_butterfly', 'Social Butterfly', 'Tenha 20 amigos', 'friends_count', 20, 'rare', 'social', '🦋'),
  ('list_curator', 'Curador', 'Crie 10 listas personalizadas', 'lists_count', 10, 'uncommon', 'collection', '📋');

-- Adicionar política para amigos verem anime_entries de usuários públicos
CREATE POLICY "Friends can view anime entries"
ON public.anime_entries FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.requester_id = auth.uid() AND f.addressee_id = anime_entries.user_id)
      OR (f.addressee_id = auth.uid() AND f.requester_id = anime_entries.user_id)
    )
  )
);
