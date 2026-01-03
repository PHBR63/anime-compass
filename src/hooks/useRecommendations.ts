import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CatalogAnime } from '@/types/catalog';

/**
 * Interface para recomendação inteligente com score de compatibilidade
 */
export interface SmartRecommendation {
  anime: CatalogAnime;
  matchScore: number; // 0-100 pontos de compatibilidade
  reasons: {
    genres: string[]; // Gêneros que combinam
    studio: string | null; // Estúdio favorito do usuário
    similarity: string | null; // Motivo de similaridade
    aiExplanation: string; // Explicação gerada por IA
  };
  confidence: 'high' | 'medium' | 'low'; // Nível de confiança
}

/**
 * Interface legada para compatibilidade
 */
export interface RecommendedAnime extends CatalogAnime {
  recommendedBecause: string;
}

/**
 * Dados de gênero com contagem
 */
export interface GenreData {
  id: number;
  name: string;
  count?: number;
  weight?: number;
}

/**
 * Dados de estúdio favorito
 */
export interface StudioData {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

/**
 * Estatísticas do usuário para contexto
 */
export interface UserStats {
  analyzedAnimes: number;
  avgRating: string;
  favoriteGenres: string[];
}

/**
 * Resposta do sistema de recomendações inteligente
 */
export interface SmartRecommendationsResponse {
  recommendations: SmartRecommendation[];
  topGenres: GenreData[];
  topStudios: StudioData[];
  userStats: UserStats;
  message?: string;
}

/**
 * Resposta legada (para compatibilidade)
 */
interface LegacyRecommendationsResponse {
  recommendations: RecommendedAnime[];
  topGenres: GenreData[];
  analyzedAnimes?: number;
  message?: string;
}

/**
 * Converte resposta da API para o formato esperado
 * Suporta tanto o novo formato inteligente quanto o legado
 */
function normalizeResponse(data: any): SmartRecommendationsResponse {
  // Se já é o novo formato
  if (data.recommendations?.[0]?.matchScore !== undefined) {
    return data as SmartRecommendationsResponse;
  }

  // Converte formato legado para o novo
  const legacyData = data as LegacyRecommendationsResponse;
  
  return {
    recommendations: (legacyData.recommendations || []).map(anime => ({
      anime: anime as CatalogAnime,
      matchScore: Math.round((anime.score || 7) * 10), // Converte score MAL para 0-100
      reasons: {
        genres: [],
        studio: null,
        similarity: null,
        aiExplanation: anime.recommendedBecause || 'Recomendado com base no seu perfil'
      },
      confidence: 'medium' as const
    })),
    topGenres: legacyData.topGenres || [],
    topStudios: [],
    userStats: {
      analyzedAnimes: legacyData.analyzedAnimes || 0,
      avgRating: '7.0',
      favoriteGenres: legacyData.topGenres?.map(g => g.name) || []
    },
    message: legacyData.message
  };
}

/**
 * Hook para buscar recomendações personalizadas inteligentes
 * Utiliza análise de perfil, scoring e explicações IA
 */
export function useRecommendations() {
  return useQuery<SmartRecommendationsResponse>({
    queryKey: ['recommendations', 'smart'],
    queryFn: async () => {
      // Verificar sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('Sessão não encontrada, tentando atualizar...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Erro ao atualizar sessão:', refreshError);
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
      }
      
      const { data, error } = await supabase.functions.invoke('get-recommendations');
      
      if (error) {
        console.error('Erro ao buscar recomendações:', error);
        if (error.message?.includes('401') || error.message?.includes('não autorizado')) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        throw error;
      }
      
      return normalizeResponse(data);
    },
    staleTime: 1000 * 60 * 30, // 30 minutos de cache
    gcTime: 1000 * 60 * 60, // 1 hora em memória
    retry: 1,
  });
}

/**
 * Retorna cor baseada no score de compatibilidade
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-muted-foreground';
}

/**
 * Retorna cor de fundo do badge baseada no nível de confiança
 */
export function getConfidenceBadgeClass(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'bg-green-500/20 text-green-500 border-green-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'low':
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
  }
}

/**
 * Formata o score para exibição
 */
export function formatMatchScore(score: number): string {
  return `${score}% match`;
}
