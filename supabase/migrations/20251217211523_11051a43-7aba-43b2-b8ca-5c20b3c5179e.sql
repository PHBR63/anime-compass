-- =====================================================
-- FASE 1: Migrar FKs das principais tabelas para profiles
-- =====================================================

-- 1.1 anime_entries.user_id → profiles.id
ALTER TABLE public.anime_entries 
  DROP CONSTRAINT IF EXISTS anime_entries_user_id_fkey;
ALTER TABLE public.anime_entries 
  ADD CONSTRAINT anime_entries_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.2 reviews.user_id → profiles.id
ALTER TABLE public.reviews 
  DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.reviews 
  ADD CONSTRAINT reviews_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.3 friendships.requester_id → profiles.id
ALTER TABLE public.friendships 
  DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey;
ALTER TABLE public.friendships 
  ADD CONSTRAINT friendships_requester_id_profiles_fkey 
  FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.4 friendships.addressee_id → profiles.id
ALTER TABLE public.friendships 
  DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;
ALTER TABLE public.friendships 
  ADD CONSTRAINT friendships_addressee_id_profiles_fkey 
  FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.5 notifications.user_id → profiles.id
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.6 chat_messages.sender_id → profiles.id
ALTER TABLE public.chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT chat_messages_sender_id_profiles_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.7 conversation_participants.user_id → profiles.id
ALTER TABLE public.conversation_participants 
  DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
ALTER TABLE public.conversation_participants 
  ADD CONSTRAINT conversation_participants_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.8 user_achievements.user_id → profiles.id
ALTER TABLE public.user_achievements 
  DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
ALTER TABLE public.user_achievements 
  ADD CONSTRAINT user_achievements_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.9 activity_reactions.user_id → profiles.id
ALTER TABLE public.activity_reactions 
  DROP CONSTRAINT IF EXISTS activity_reactions_user_id_fkey;
ALTER TABLE public.activity_reactions 
  ADD CONSTRAINT activity_reactions_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.10 anime_recommendations.from_user_id e to_user_id → profiles.id
ALTER TABLE public.anime_recommendations 
  DROP CONSTRAINT IF EXISTS anime_recommendations_from_user_id_fkey;
ALTER TABLE public.anime_recommendations 
  ADD CONSTRAINT anime_recommendations_from_user_id_profiles_fkey 
  FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.anime_recommendations 
  DROP CONSTRAINT IF EXISTS anime_recommendations_to_user_id_fkey;
ALTER TABLE public.anime_recommendations 
  ADD CONSTRAINT anime_recommendations_to_user_id_profiles_fkey 
  FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.11 episode_progress_history.user_id → profiles.id
ALTER TABLE public.episode_progress_history 
  DROP CONSTRAINT IF EXISTS episode_progress_history_user_id_fkey;
ALTER TABLE public.episode_progress_history 
  ADD CONSTRAINT episode_progress_history_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.12 review_reactions.user_id → profiles.id
ALTER TABLE public.review_reactions 
  DROP CONSTRAINT IF EXISTS review_reactions_user_id_fkey;
ALTER TABLE public.review_reactions 
  ADD CONSTRAINT review_reactions_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.13 chat_message_reactions.user_id → profiles.id
ALTER TABLE public.chat_message_reactions 
  DROP CONSTRAINT IF EXISTS chat_message_reactions_user_id_fkey;
ALTER TABLE public.chat_message_reactions 
  ADD CONSTRAINT chat_message_reactions_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.14 list_items FKs
ALTER TABLE public.list_items 
  DROP CONSTRAINT IF EXISTS list_items_list_id_fkey;
ALTER TABLE public.list_items 
  ADD CONSTRAINT list_items_list_id_fkey 
  FOREIGN KEY (list_id) REFERENCES public.custom_lists(id) ON DELETE CASCADE;

ALTER TABLE public.list_items 
  DROP CONSTRAINT IF EXISTS list_items_anime_entry_id_fkey;
ALTER TABLE public.list_items 
  ADD CONSTRAINT list_items_anime_entry_id_fkey 
  FOREIGN KEY (anime_entry_id) REFERENCES public.anime_entries(id) ON DELETE CASCADE;

-- =====================================================
-- FASE 2: Forçar reload do schema do PostgREST
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- FASE 3: Garantir política RLS simplificada para anon
-- =====================================================

-- Remover políticas antigas de anon se existirem
DROP POLICY IF EXISTS "anon_view_public_list_entries" ON public.anime_entries;

-- Criar política simplificada para anime_entries (anon pode ver entradas de listas públicas)
CREATE POLICY "anon_view_public_list_entries" ON public.anime_entries
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.list_items li
      JOIN public.custom_lists cl ON cl.id = li.list_id
      WHERE li.anime_entry_id = anime_entries.id
        AND cl.is_public = true
    )
  );