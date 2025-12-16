import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JikanAnime } from './useJikanApi';

// Tipo para anime com motivo da recomendação
export interface RecommendedAnime extends JikanAnime {
  recommendedBecause: string;
}

// Tipo da resposta de recomendações
interface RecommendationsResponse {
  recommendations: RecommendedAnime[];
  topGenres: { id: number; name: string }[];
  analyzedAnimes?: number;
  message?: string;
}

// Hook para buscar recomendações personalizadas do usuário
export function useRecommendations() {
  return useQuery<RecommendationsResponse>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-recommendations');
      
      if (error) {
        console.error('Erro ao buscar recomendações:', error);
        throw error;
      }
      
      return data as RecommendationsResponse;
    },
    staleTime: 1000 * 60 * 30, // 30 minutos de cache
    gcTime: 1000 * 60 * 60, // 1 hora em memória
    retry: 1,
  });
}
