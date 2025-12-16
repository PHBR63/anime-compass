import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlocked_at?: string;
}

export function useAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      // Get all achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Get user's unlocked achievements
      let userAchievements: UserAchievement[] = [];
      if (user) {
        const { data, error } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        userAchievements = data || [];
      }

      // Combine data
      const achievementsWithStatus: AchievementWithStatus[] = (achievements || []).map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
        return {
          ...achievement,
          unlocked: !!userAchievement,
          unlocked_at: userAchievement?.unlocked_at,
        };
      });

      return achievementsWithStatus;
    },
  });
}

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
