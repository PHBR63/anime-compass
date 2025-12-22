import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useOnlineStatus } from './useOnlineStatus';
import { addToQueue } from '@/lib/offlineQueue';

// Tipo para review com dados do perfil do autor
export interface Review {
  id: string;
  user_id: string;
  mal_id: number;
  title: string;
  content: string;
  rating: number | null;
  has_spoilers: boolean;
  tags: string[] | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // Dados do autor
  author?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  // Reação do usuário atual
  userReaction?: {
    id: string;
    is_like: boolean;
  } | null;
}

// Hook para buscar reviews de um anime
export function useAnimeReviews(malId: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reviews', malId],
    queryFn: async () => {
      // Buscar reviews
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('mal_id', malId)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis dos autores
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      // Buscar reações do usuário atual
      let userReactions: { review_id: string; id: string; is_like: boolean }[] = [];
      if (user) {
        const { data } = await supabase
          .from('review_reactions')
          .select('id, review_id, is_like')
          .eq('user_id', user.id)
          .in('review_id', reviews.map(r => r.id));
        userReactions = data || [];
      }

      // Montar dados completos
      return reviews.map(review => ({
        ...review,
        author: profiles?.find(p => p.id === review.user_id) || null,
        userReaction: userReactions.find(r => r.review_id === review.id) || null,
      })) as Review[];
    },
    enabled: malId > 0,
  });
}

// Hook para buscar todas as reviews da comunidade (feed público)
export function useCommunityReviews(options?: { limit?: number; orderBy?: 'recent' | 'popular' }) {
  const { user } = useAuth();
  const limit = options?.limit || 50;
  const orderBy = options?.orderBy || 'recent';

  return useQuery({
    queryKey: ['communityReviews', orderBy, limit],
    queryFn: async () => {
      // Buscar reviews
      let query = supabase
        .from('reviews')
        .select('*')
        .limit(limit);

      // Ordenação
      if (orderBy === 'popular') {
        query = query.order('likes_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: reviews, error } = await query;
      if (error) throw error;

      // Buscar perfis dos autores
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      // Buscar reações do usuário atual
      let userReactions: { review_id: string; id: string; is_like: boolean }[] = [];
      if (user) {
        const { data } = await supabase
          .from('review_reactions')
          .select('id, review_id, is_like')
          .eq('user_id', user.id)
          .in('review_id', reviews.map(r => r.id));
        userReactions = data || [];
      }

      // Montar dados completos
      return reviews.map(review => ({
        ...review,
        author: profiles?.find(p => p.id === review.user_id) || null,
        userReaction: userReactions.find(r => r.review_id === review.id) || null,
      })) as Review[];
    },
  });
}

// Hook para buscar reviews de um usuário específico
export function useUserReviews(userId: string | undefined) {
  const { user: currentUser } = useAuth();

  return useQuery({
    queryKey: ['userReviews', userId],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar perfil do autor
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', userId!)
        .single();

      // Buscar reações do usuário atual
      let userReactions: { review_id: string; id: string; is_like: boolean }[] = [];
      if (currentUser) {
        const { data } = await supabase
          .from('review_reactions')
          .select('id, review_id, is_like')
          .eq('user_id', currentUser.id)
          .in('review_id', reviews.map(r => r.id));
        userReactions = data || [];
      }

      return reviews.map(review => ({
        ...review,
        author: profile || null,
        userReaction: userReactions.find(r => r.review_id === review.id) || null,
      })) as Review[];
    },
    enabled: !!userId,
  });
}

// Hook para buscar review do usuário atual para um anime
export function useUserReview(malId: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userReview', malId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('mal_id', malId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && malId > 0,
  });
}

/**
 * Hook para criar review com suporte offline
 * Se offline, adiciona à fila de sincronização
 */
export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async (data: {
      mal_id: number;
      title: string;
      content: string;
      rating?: number;
      has_spoilers?: boolean;
      tags?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Se offline, adiciona à fila
      if (!isOnline) {
        await addToQueue('add-review', {
          user_id: user.id,
          mal_id: data.mal_id,
          title: data.title,
          content: data.content,
          rating: data.rating || null,
          has_spoilers: data.has_spoilers || false,
          tags: data.tags || null,
        }, user.id);
        return;
      }
      
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          mal_id: data.mal_id,
          title: data.title,
          content: data.content,
          rating: data.rating || null,
          has_spoilers: data.has_spoilers || false,
          tags: data.tags || null,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.mal_id] });
      queryClient.invalidateQueries({ queryKey: ['userReview', variables.mal_id] });
      if (isOnline) {
        toast.success('Review publicada com sucesso!');
      } else {
        toast.success('Review salva offline! Será publicada quando voltar online.');
      }
    },
    onError: () => {
      toast.error('Erro ao publicar review');
    },
  });
}

/**
 * Hook para atualizar review com suporte offline
 * Se offline, adiciona à fila de sincronização
 */
export function useUpdateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      mal_id: number;
      title?: string;
      content?: string;
      rating?: number | null;
      has_spoilers?: boolean;
      tags?: string[];
    }) => {
      // Se offline, adiciona à fila
      if (!isOnline && user) {
        await addToQueue('update-review', data, user.id);
        return;
      }
      
      const { error } = await supabase
        .from('reviews')
        .update({
          title: data.title,
          content: data.content,
          rating: data.rating,
          has_spoilers: data.has_spoilers,
          tags: data.tags,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.mal_id] });
      queryClient.invalidateQueries({ queryKey: ['userReview', variables.mal_id] });
      if (isOnline) {
        toast.success('Review atualizada!');
      } else {
        toast.info('Alteração salva offline');
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar review');
    },
  });
}

// Hook para deletar review
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; mal_id: number }) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.mal_id] });
      queryClient.invalidateQueries({ queryKey: ['userReview', variables.mal_id] });
      toast.success('Review removida');
    },
    onError: () => {
      toast.error('Erro ao remover review');
    },
  });
}

// Hook para reagir a uma review (like/dislike)
export function useToggleReviewReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { reviewId: string; malId: number; isLike: boolean }) => {
      // Verificar se já existe reação
      const { data: existing } = await supabase
        .from('review_reactions')
        .select('id, is_like')
        .eq('review_id', data.reviewId)
        .eq('user_id', user!.id)
        .maybeSingle();

      // Buscar likes_count atual
      const { data: review } = await supabase
        .from('reviews')
        .select('likes_count')
        .eq('id', data.reviewId)
        .single();

      const currentLikes = review?.likes_count || 0;

      if (existing) {
        if (existing.is_like === data.isLike) {
          // Mesma reação - remover
          await supabase.from('review_reactions').delete().eq('id', existing.id);
          // Atualizar contador
          const newCount = data.isLike ? currentLikes - 1 : currentLikes + 1;
          await supabase.from('reviews').update({ likes_count: Math.max(0, newCount) }).eq('id', data.reviewId);
        } else {
          // Reação diferente - atualizar
          await supabase
            .from('review_reactions')
            .update({ is_like: data.isLike })
            .eq('id', existing.id);
          // Atualizar contador (2x porque troca)
          const delta = data.isLike ? 2 : -2;
          await supabase.from('reviews').update({ likes_count: Math.max(0, currentLikes + delta) }).eq('id', data.reviewId);
        }
      } else {
        // Nova reação
        await supabase.from('review_reactions').insert({
          review_id: data.reviewId,
          user_id: user!.id,
          is_like: data.isLike,
        });
        // Atualizar contador
        const delta = data.isLike ? 1 : -1;
        await supabase.from('reviews').update({ likes_count: Math.max(0, currentLikes + delta) }).eq('id', data.reviewId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.malId] });
    },
  });
}
