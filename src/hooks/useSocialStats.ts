import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFriends } from './useFriendships';

// Interface para ranking de amigos
interface FriendRanking {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  totalAnimes: number;
  completedAnimes: number;
  averageRating: number | null;
}

// Interface para anime em alta entre amigos
interface TrendingAnime {
  malId: number;
  title: string;
  imageUrl: string | null;
  friendsWatching: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
  }[];
  totalFriends: number;
}

// Interface para anime em comum
interface CommonAnime {
  malId: number;
  title: string;
  imageUrl: string | null;
  myStatus: string;
  myRating: number | null;
  friends: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
    rating: number | null;
  }[];
}

// Hook para buscar ranking de amigos por total de animes
export function useFriendsRanking() {
  const { data: friends } = useFriends();

  return useQuery({
    queryKey: ['friends-ranking', friends?.map(f => f.friend.id)],
    queryFn: async (): Promise<FriendRanking[]> => {
      if (!friends || friends.length === 0) return [];

      const friendIds = friends.map(f => f.friend.id);

      // Buscar estatísticas de cada amigo
      const { data: entries, error } = await supabase
        .from('anime_entries')
        .select('user_id, status, rating')
        .in('user_id', friendIds);

      if (error) throw error;

      // Agregar estatísticas por usuário
      const statsMap = new Map<string, {
        total: number;
        completed: number;
        ratings: number[];
      }>();

      entries?.forEach(entry => {
        const stats = statsMap.get(entry.user_id) || { total: 0, completed: 0, ratings: [] };
        stats.total++;
        if (entry.status === 'completed') stats.completed++;
        if (entry.rating) stats.ratings.push(Number(entry.rating));
        statsMap.set(entry.user_id, stats);
      });

      // Criar ranking
      const ranking: FriendRanking[] = friends.map(f => {
        const stats = statsMap.get(f.friend.id) || { total: 0, completed: 0, ratings: [] };
        const avgRating = stats.ratings.length > 0
          ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
          : null;

        return {
          userId: f.friend.id,
          displayName: f.friend.display_name || f.friend.username || 'Usuário',
          username: f.friend.username,
          avatarUrl: f.friend.avatar_url,
          totalAnimes: stats.total,
          completedAnimes: stats.completed,
          averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        };
      });

      // Ordenar por total de animes
      return ranking.sort((a, b) => b.totalAnimes - a.totalAnimes);
    },
    enabled: !!friends && friends.length > 0,
  });
}

// Hook para buscar animes em alta entre amigos
export function useTrendingAmongFriends() {
  const { data: friends } = useFriends();

  return useQuery({
    queryKey: ['trending-among-friends', friends?.map(f => f.friend.id)],
    queryFn: async (): Promise<TrendingAnime[]> => {
      if (!friends || friends.length === 0) return [];

      const friendIds = friends.map(f => f.friend.id);

      // Buscar entradas de animes dos amigos
      const { data: entries, error } = await supabase
        .from('anime_entries')
        .select('mal_id, title, image_url, user_id, status')
        .in('user_id', friendIds)
        .in('status', ['watching', 'completed']);

      if (error) throw error;

      // Criar mapa de amigos para fácil acesso
      const friendMap = new Map(friends.map(f => [f.friend.id, f.friend]));

      // Agregar por anime
      const animeMap = new Map<number, TrendingAnime>();

      entries?.forEach(entry => {
        const existing = animeMap.get(entry.mal_id) || {
          malId: entry.mal_id,
          title: entry.title,
          imageUrl: entry.image_url,
          friendsWatching: [],
          totalFriends: 0,
        };

        const friend = friendMap.get(entry.user_id);
        if (friend) {
          existing.friendsWatching.push({
            userId: entry.user_id,
            displayName: friend.display_name || friend.username || 'Usuário',
            avatarUrl: friend.avatar_url,
            status: entry.status,
          });
          existing.totalFriends = existing.friendsWatching.length;
        }

        animeMap.set(entry.mal_id, existing);
      });

      // Converter para array e ordenar por quantidade de amigos
      return Array.from(animeMap.values())
        .filter(a => a.totalFriends >= 1)
        .sort((a, b) => b.totalFriends - a.totalFriends)
        .slice(0, 20);
    },
    enabled: !!friends && friends.length > 0,
  });
}

// Hook para buscar animes em comum com amigos
export function useCommonAnimes() {
  const { data: friends } = useFriends();

  return useQuery({
    queryKey: ['common-animes', friends?.map(f => f.friend.id)],
    queryFn: async (): Promise<CommonAnime[]> => {
      if (!friends || friends.length === 0) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const friendIds = friends.map(f => f.friend.id);

      // Buscar meus animes
      const { data: myEntries, error: myError } = await supabase
        .from('anime_entries')
        .select('mal_id, title, image_url, status, rating')
        .eq('user_id', user.id);

      if (myError) throw myError;

      // Buscar animes dos amigos
      const { data: friendEntries, error: friendError } = await supabase
        .from('anime_entries')
        .select('mal_id, user_id, status, rating')
        .in('user_id', friendIds);

      if (friendError) throw friendError;

      // Criar mapa de amigos
      const friendMap = new Map(friends.map(f => [f.friend.id, f.friend]));

      // Criar mapa de entradas de amigos por anime
      const friendEntriesMap = new Map<number, typeof friendEntries>();
      friendEntries?.forEach(entry => {
        const existing = friendEntriesMap.get(entry.mal_id) || [];
        existing.push(entry);
        friendEntriesMap.set(entry.mal_id, existing);
      });

      // Encontrar animes em comum
      const commonAnimes: CommonAnime[] = [];

      myEntries?.forEach(myEntry => {
        const friendsWithAnime = friendEntriesMap.get(myEntry.mal_id) || [];
        
        if (friendsWithAnime.length >= 1) {
          commonAnimes.push({
            malId: myEntry.mal_id,
            title: myEntry.title,
            imageUrl: myEntry.image_url,
            myStatus: myEntry.status,
            myRating: myEntry.rating ? Number(myEntry.rating) : null,
            friends: friendsWithAnime.map(fe => {
              const friend = friendMap.get(fe.user_id);
              return {
                userId: fe.user_id,
                displayName: friend?.display_name || friend?.username || 'Usuário',
                avatarUrl: friend?.avatar_url || null,
                status: fe.status,
                rating: fe.rating ? Number(fe.rating) : null,
              };
            }),
          });
        }
      });

      // Ordenar por quantidade de amigos em comum
      return commonAnimes.sort((a, b) => b.friends.length - a.friends.length);
    },
    enabled: !!friends && friends.length > 0,
  });
}
