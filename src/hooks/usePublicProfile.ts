import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface PublicProfileData {
  profile: Profile;
  stats: {
    totalAnimes: number;
    completedAnimes: number;
    watchingAnimes: number;
    totalEpisodes: number;
    averageRating: number;
    favoriteCount: number;
  };
  achievements: {
    id: string;
    code: string;
    name: string;
    icon: string | null;
    rarity: string | null;
    unlocked_at: string;
  }[];
  favorites: {
    id: string;
    title: string;
    image_url: string | null;
    rating: number | null;
  }[];
  publicLists: {
    id: string;
    name: string;
    description: string | null;
    cover_url: string | null;
    item_count: number;
  }[];
}

// Hook para buscar perfil público por username
export function usePublicProfileByUsername(username: string) {
  return useQuery({
    queryKey: ['public-profile', 'username', username],
    queryFn: async (): Promise<PublicProfileData | null> => {
      // Buscar perfil pelo username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('is_public', true)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      // Buscar estatísticas
      const { data: entries } = await supabase
        .from('anime_entries')
        .select('*')
        .eq('user_id', profile.id);

      const totalAnimes = entries?.length || 0;
      const completedAnimes = entries?.filter(e => e.status === 'completed').length || 0;
      const watchingAnimes = entries?.filter(e => e.status === 'watching').length || 0;
      const totalEpisodes = entries?.reduce((sum, e) => sum + (e.episodes_watched || 0), 0) || 0;
      const ratedEntries = entries?.filter(e => e.rating !== null) || [];
      const averageRating = ratedEntries.length > 0
        ? ratedEntries.reduce((sum, e) => sum + (Number(e.rating) || 0), 0) / ratedEntries.length
        : 0;
      const favoriteCount = entries?.filter(e => e.is_favorite).length || 0;

      // Buscar conquistas desbloqueadas
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          achievement_id,
          achievements!inner (
            id,
            code,
            name,
            icon,
            rarity
          )
        `)
        .eq('user_id', profile.id)
        .order('unlocked_at', { ascending: false })
        .limit(10);

      const achievements = userAchievements?.map(ua => ({
        id: (ua.achievements as any).id,
        code: (ua.achievements as any).code,
        name: (ua.achievements as any).name,
        icon: (ua.achievements as any).icon,
        rarity: (ua.achievements as any).rarity,
        unlocked_at: ua.unlocked_at
      })) || [];

      // Buscar favoritos
      const favorites = entries
        ?.filter(e => e.is_favorite)
        .slice(0, 6)
        .map(e => ({
          id: e.id,
          title: e.title,
          image_url: e.image_url,
          rating: e.rating ? Number(e.rating) : null
        })) || [];

      // Buscar listas públicas
      const { data: lists } = await supabase
        .from('custom_lists')
        .select('id, name, description, cover_url')
        .eq('user_id', profile.id)
        .eq('is_public', true);

      // Contar itens de cada lista
      const publicLists = await Promise.all(
        (lists || []).map(async (list) => {
          const { count } = await supabase
            .from('list_items')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          return {
            ...list,
            item_count: count || 0
          };
        })
      );

      return {
        profile,
        stats: {
          totalAnimes,
          completedAnimes,
          watchingAnimes,
          totalEpisodes,
          averageRating,
          favoriteCount
        },
        achievements,
        favorites,
        publicLists
      };
    },
    enabled: !!username,
  });
}

// Hook para buscar perfil público por ID
export function usePublicProfileById(userId: string) {
  return useQuery({
    queryKey: ['public-profile', 'id', userId],
    queryFn: async (): Promise<PublicProfileData | null> => {
      // Buscar perfil pelo ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      // Buscar estatísticas
      const { data: entries } = await supabase
        .from('anime_entries')
        .select('*')
        .eq('user_id', profile.id);

      const totalAnimes = entries?.length || 0;
      const completedAnimes = entries?.filter(e => e.status === 'completed').length || 0;
      const watchingAnimes = entries?.filter(e => e.status === 'watching').length || 0;
      const totalEpisodes = entries?.reduce((sum, e) => sum + (e.episodes_watched || 0), 0) || 0;
      const ratedEntries = entries?.filter(e => e.rating !== null) || [];
      const averageRating = ratedEntries.length > 0
        ? ratedEntries.reduce((sum, e) => sum + (Number(e.rating) || 0), 0) / ratedEntries.length
        : 0;
      const favoriteCount = entries?.filter(e => e.is_favorite).length || 0;

      // Buscar conquistas desbloqueadas
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          achievement_id,
          achievements!inner (
            id,
            code,
            name,
            icon,
            rarity
          )
        `)
        .eq('user_id', profile.id)
        .order('unlocked_at', { ascending: false })
        .limit(10);

      const achievements = userAchievements?.map(ua => ({
        id: (ua.achievements as any).id,
        code: (ua.achievements as any).code,
        name: (ua.achievements as any).name,
        icon: (ua.achievements as any).icon,
        rarity: (ua.achievements as any).rarity,
        unlocked_at: ua.unlocked_at
      })) || [];

      // Buscar favoritos
      const favorites = entries
        ?.filter(e => e.is_favorite)
        .slice(0, 6)
        .map(e => ({
          id: e.id,
          title: e.title,
          image_url: e.image_url,
          rating: e.rating ? Number(e.rating) : null
        })) || [];

      // Buscar listas públicas
      const { data: lists } = await supabase
        .from('custom_lists')
        .select('id, name, description, cover_url')
        .eq('user_id', profile.id)
        .eq('is_public', true);

      // Contar itens de cada lista
      const publicLists = await Promise.all(
        (lists || []).map(async (list) => {
          const { count } = await supabase
            .from('list_items')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          return {
            ...list,
            item_count: count || 0
          };
        })
      );

      return {
        profile,
        stats: {
          totalAnimes,
          completedAnimes,
          watchingAnimes,
          totalEpisodes,
          averageRating,
          favoriteCount
        },
        achievements,
        favorites,
        publicLists
      };
    },
    enabled: !!userId,
  });
}
