import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

// Interface para progresso de cada conquista
export interface AchievementProgress {
  current: number;
  target: number;
}

// Interface para conquista com status e progresso
export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlocked_at?: string;
  progress?: AchievementProgress;
}

// Interface para estatísticas do usuário usadas no cálculo de progresso
interface UserStats {
  animeCount: number;
  completedCount: number;
  reviewCount: number;
  friendCount: number;
  listCount: number;
}

// Hook principal para buscar conquistas com progresso e atualização em tempo real
export function useAchievements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Configura subscription para atualizações em tempo real
  useEffect(() => {
    if (!user) return;

    // Canal para monitorar novas conquistas desbloqueadas
    const userAchievementsChannel = supabase
      .channel('user-achievements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalida o cache para recarregar os dados
          queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
          queryClient.invalidateQueries({ queryKey: ['achievement-stats', user.id] });
        }
      )
      .subscribe();

    // Canal para monitorar mudanças que afetam o progresso (anime_entries, reviews, etc.)
    const progressChannel = supabase
      .channel('achievements-progress-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'anime_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_lists',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userAchievementsChannel);
      supabase.removeChannel(progressChannel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      // Buscar todas as conquistas
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true })
        .order('requirement_value', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Se não há usuário, retornar conquistas sem status
      if (!user) {
        return (achievements || []).map(achievement => ({
          ...achievement,
          unlocked: false,
          progress: { current: 0, target: achievement.requirement_value },
        })) as AchievementWithStatus[];
      }

      // Buscar conquistas desbloqueadas do usuário
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      // Buscar estatísticas do usuário para calcular progresso
      const userStats = await fetchUserStats(user.id);

      // Combinar dados com progresso
      const achievementsWithStatus: AchievementWithStatus[] = (achievements || []).map(achievement => {
        const userAchievement = userAchievements?.find(ua => ua.achievement_id === achievement.id);
        const progress = calculateProgress(achievement, userStats);

        return {
          ...achievement,
          unlocked: !!userAchievement,
          unlocked_at: userAchievement?.unlocked_at,
          progress,
        };
      });

      return achievementsWithStatus;
    },
  });
}

// Função para buscar estatísticas do usuário
async function fetchUserStats(userId: string): Promise<UserStats> {
  // Buscar contagem de animes
  const { count: animeCount } = await supabase
    .from('anime_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_archived', false);

  // Buscar contagem de animes completados
  const { count: completedCount } = await supabase
    .from('anime_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('is_archived', false);

  // Buscar contagem de reviews
  const { count: reviewCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Buscar contagem de amigos aceitos
  const { count: friendCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  // Buscar contagem de listas customizadas
  const { count: listCount } = await supabase
    .from('custom_lists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    animeCount: animeCount || 0,
    completedCount: completedCount || 0,
    reviewCount: reviewCount || 0,
    friendCount: friendCount || 0,
    listCount: listCount || 0,
  };
}

// Função para calcular progresso baseado no tipo de requisito
function calculateProgress(achievement: Achievement, stats: UserStats): AchievementProgress {
  let current = 0;

  switch (achievement.requirement_type) {
    case 'anime_count':
      current = stats.animeCount;
      break;
    case 'completed_count':
      current = stats.completedCount;
      break;
    case 'review_count':
      current = stats.reviewCount;
      break;
    case 'friend_count':
      current = stats.friendCount;
      break;
    case 'list_count':
      current = stats.listCount;
      break;
    default:
      current = 0;
  }

  return {
    current: Math.min(current, achievement.requirement_value), // Não ultrapassar o target
    target: achievement.requirement_value,
  };
}

// Hook para estatísticas resumidas de conquistas
export function useUserAchievementStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['achievement-stats', user?.id],
    queryFn: async () => {
      if (!user) return { unlocked: 0, total: 0, percentage: 0 };

      const { count: total } = await supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true });

      const { count: unlocked } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return {
        unlocked: unlocked || 0,
        total: total || 0,
        percentage: total ? Math.round(((unlocked || 0) / total) * 100) : 0,
      };
    },
    enabled: !!user,
  });
}
