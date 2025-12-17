import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ListComparisonResult {
  commonAnimes: {
    mal_id: number;
    title: string;
    image_url: string | null;
    myRating: number | null;
    friendRating: number | null;
  }[];
  onlyMe: {
    mal_id: number;
    title: string;
    image_url: string | null;
    rating: number | null;
    status: string;
  }[];
  onlyFriend: {
    mal_id: number;
    title: string;
    image_url: string | null;
    rating: number | null;
    status: string;
  }[];
  compatibility: number;
  totalCommon: number;
}

// Hook para comparar listas entre dois usuários
export function useListComparison(friendId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['list-comparison', user?.id, friendId],
    queryFn: async (): Promise<ListComparisonResult | null> => {
      if (!user || !friendId) return null;

      // Buscar entradas do usuário atual
      const { data: myEntries } = await supabase
        .from('anime_entries')
        .select('mal_id, title, image_url, rating, status')
        .eq('user_id', user.id);

      // Buscar entradas do amigo
      const { data: friendEntries } = await supabase
        .from('anime_entries')
        .select('mal_id, title, image_url, rating, status')
        .eq('user_id', friendId);

      if (!myEntries || !friendEntries) return null;

      const myAnimeMap = new Map(myEntries.map(e => [e.mal_id, e]));
      const friendAnimeMap = new Map(friendEntries.map(e => [e.mal_id, e]));

      // Encontrar animes em comum
      const commonAnimes: ListComparisonResult['commonAnimes'] = [];
      let ratingDifferenceSum = 0;
      let ratingComparisonCount = 0;

      myEntries.forEach(myEntry => {
        const friendEntry = friendAnimeMap.get(myEntry.mal_id);
        if (friendEntry) {
          commonAnimes.push({
            mal_id: myEntry.mal_id,
            title: myEntry.title,
            image_url: myEntry.image_url,
            myRating: myEntry.rating ? Number(myEntry.rating) : null,
            friendRating: friendEntry.rating ? Number(friendEntry.rating) : null
          });

          // Calcular diferença de rating para compatibilidade
          if (myEntry.rating && friendEntry.rating) {
            ratingDifferenceSum += Math.abs(Number(myEntry.rating) - Number(friendEntry.rating));
            ratingComparisonCount++;
          }
        }
      });

      // Animes que só eu tenho
      const onlyMe = myEntries
        .filter(e => !friendAnimeMap.has(e.mal_id))
        .map(e => ({
          mal_id: e.mal_id,
          title: e.title,
          image_url: e.image_url,
          rating: e.rating ? Number(e.rating) : null,
          status: e.status
        }));

      // Animes que só o amigo tem
      const onlyFriend = friendEntries
        .filter(e => !myAnimeMap.has(e.mal_id))
        .map(e => ({
          mal_id: e.mal_id,
          title: e.title,
          image_url: e.image_url,
          rating: e.rating ? Number(e.rating) : null,
          status: e.status
        }));

      // Calcular compatibilidade (baseado em ratings similares)
      let compatibility = 0;
      if (ratingComparisonCount > 0) {
        // Média da diferença de ratings (0-10)
        const avgDifference = ratingDifferenceSum / ratingComparisonCount;
        // Converter para porcentagem (0 diferença = 100%, 10 diferença = 0%)
        compatibility = Math.round(100 - (avgDifference * 10));
      } else if (commonAnimes.length > 0) {
        // Se tiverem animes em comum mas sem ratings, dar um bônus base
        compatibility = 50 + Math.min(commonAnimes.length * 2, 30);
      }

      return {
        commonAnimes: commonAnimes.slice(0, 20), // Limitar para performance
        onlyMe: onlyMe.slice(0, 20),
        onlyFriend: onlyFriend.slice(0, 20),
        compatibility: Math.max(0, Math.min(100, compatibility)),
        totalCommon: commonAnimes.length
      };
    },
    enabled: !!user && !!friendId,
  });
}
