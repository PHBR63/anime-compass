/**
 * Hook para buscar dados de anime com fallback para Jikan API
 * Prioriza a nova API externa, mas usa Jikan como fallback para animes não encontrados
 */

import { useQuery } from '@tanstack/react-query';
import type { CatalogAnime } from '@/types/catalog';

// URLs das APIs
const CATALOG_API_URL = 'https://xhyairbedwqezegopjan.supabase.co/functions/v1/anime-api';
const JIKAN_API_URL = 'https://api.jikan.moe/v4';

// Interface para dados mínimos do Jikan (apenas o necessário)
interface JikanAnimeData {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  images: {
    jpg: {
      large_image_url: string;
    };
  };
  score: number | null;
  scored_by: number | null;
  episodes: number | null;
  status: string | null;
  type: string | null;
  rating: string | null;
  year: number | null;
  season: string | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  genres: Array<{ mal_id: number; name: string }>;
  studios: Array<{ mal_id: number; name: string }>;
}

// Resultado do hook com indicador de fonte
export interface AnimeWithSource {
  anime: CatalogAnime | null;
  source: 'catalog' | 'jikan' | 'local' | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Converte dados do Jikan para o formato CatalogAnime
 */
function jikanToCatalogAnime(jikan: JikanAnimeData): CatalogAnime {
  return {
    id: `jikan-${jikan.mal_id}`,
    mal_id: jikan.mal_id,
    title: jikan.title,
    title_english: jikan.title_english,
    title_japanese: jikan.title_japanese,
    synopsis: jikan.synopsis,
    synopsis_pt: null, // Jikan não tem tradução PT-BR
    image_url: jikan.images?.jpg?.large_image_url || null,
    local_image_url: null,
    score: jikan.score,
    scored_by: jikan.scored_by,
    episodes: jikan.episodes,
    status: jikan.status,
    type: jikan.type,
    rating: jikan.rating,
    year: jikan.year,
    season: jikan.season,
    rank: jikan.rank,
    popularity: jikan.popularity,
    members: jikan.members,
    genres: jikan.genres || [],
    studios: jikan.studios || [],
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Busca anime primeiro na API do catálogo, depois no Jikan como fallback
 */
async function fetchAnimeWithFallback(malId: number): Promise<{ anime: CatalogAnime | null; source: 'catalog' | 'jikan' | null }> {
  // Tentar buscar na API do catálogo primeiro
  try {
    const catalogResponse = await fetch(`${CATALOG_API_URL}?mal_id=${malId}`);
    
    if (catalogResponse.ok) {
      const catalogData = await catalogResponse.json();
      if (catalogData.success && catalogData.data) {
        return { anime: catalogData.data, source: 'catalog' };
      }
    }
  } catch (error) {
    console.warn(`[AnimeWithFallback] Erro ao buscar do catálogo (mal_id: ${malId}):`, error);
  }

  // Fallback para Jikan API
  try {
    // Rate limiting básico - aguardar um pouco antes de chamar Jikan
    await new Promise(resolve => setTimeout(resolve, 350));
    
    const jikanResponse = await fetch(`${JIKAN_API_URL}/anime/${malId}`);
    
    if (jikanResponse.ok) {
      const jikanData = await jikanResponse.json();
      if (jikanData.data) {
        const convertedAnime = jikanToCatalogAnime(jikanData.data);
        return { anime: convertedAnime, source: 'jikan' };
      }
    }
  } catch (error) {
    console.warn(`[AnimeWithFallback] Erro ao buscar do Jikan (mal_id: ${malId}):`, error);
  }

  return { anime: null, source: null };
}

/**
 * Hook para buscar anime por MAL ID com fallback para Jikan
 */
export function useAnimeWithFallback(malId: number | null): AnimeWithSource {
  const query = useQuery({
    queryKey: ['anime-with-fallback', malId],
    queryFn: async () => {
      if (!malId) return { anime: null, source: null };
      return fetchAnimeWithFallback(malId);
    },
    enabled: !!malId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora (cache time)
    retry: 1, // Apenas 1 retry
  });

  return {
    anime: query.data?.anime || null,
    source: query.data?.source || null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Hook para buscar múltiplos animes com fallback (para listas)
 * Limita chamadas paralelas para evitar rate limiting
 */
export function useAnimesWithFallback(malIds: number[]) {
  return useQuery({
    queryKey: ['animes-with-fallback', malIds.sort().join(',')],
    queryFn: async () => {
      const results: Map<number, { anime: CatalogAnime | null; source: 'catalog' | 'jikan' | null }> = new Map();
      
      // Processar em lotes de 3 para evitar rate limiting
      const batchSize = 3;
      for (let i = 0; i < malIds.length; i += batchSize) {
        const batch = malIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(malId => fetchAnimeWithFallback(malId))
        );
        
        batch.forEach((malId, index) => {
          results.set(malId, batchResults[index]);
        });
        
        // Aguardar entre lotes para rate limiting
        if (i + batchSize < malIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return results;
    },
    enabled: malIds.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}
