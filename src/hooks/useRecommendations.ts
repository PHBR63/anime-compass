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
      // Verificar se há sessão ativa antes de chamar a função
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('Sessão não encontrada, tentando atualizar...');
        // Tentar atualizar a sessão
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Erro ao atualizar sessão:', refreshError);
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
      }
      
      const { data, error } = await supabase.functions.invoke('get-recommendations');
      
      if (error) {
        console.error('Erro ao buscar recomendações:', error);
        // Se for erro de autenticação, informar o usuário
        if (error.message?.includes('401') || error.message?.includes('não autorizado')) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        throw error;
      }
      
      return data as RecommendationsResponse;
    },
    staleTime: 1000 * 60 * 30, // 30 minutos de cache
    gcTime: 1000 * 60 * 60, // 1 hora em memória
    retry: 1,
    // Só executar se houver usuário logado
    enabled: true,
  });
}
