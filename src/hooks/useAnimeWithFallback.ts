/**
 * Hook para buscar dados de anime com fallback para Jikan API
 * Prioriza cache local → API do catálogo → Jikan como fallback
 */

import { useQuery } from '@tanstack/react-query';
import type { CatalogAnime } from '@/types/catalog';
import { getCachedCatalogAnime, cacheCatalogAnime } from '@/lib/offlineCache';
import { CATALOG_API_URL, JIKAN_API_URL } from '@/lib/apiConfig';

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
 * Busca anime primeiro no cache local, depois na API do catálogo, depois no Jikan como fallback
 */
async function fetchAnimeWithFallback(malId: number): Promise<{ anime: CatalogAnime | null; source: 'catalog' | 'jikan' | null }> {
  // 1. Tentar buscar do cache IndexedDB primeiro
  try {
    const cached = await getCachedCatalogAnime(malId);
    if (cached) {
      console.log(`[AnimeWithFallback] Cache hit para mal_id: ${malId} (source: ${cached.source})`);
      // O source original fica salvo, então retornamos ele
      return { anime: cached.data as unknown as CatalogAnime, source: cached.source };
    }
  } catch (error) {
    console.warn(`[AnimeWithFallback] Erro ao ler cache (mal_id: ${malId}):`, error);
  }

  // 2. Tentar buscar na API do catálogo
  try {
    const catalogResponse = await fetch(`${CATALOG_API_URL}?mal_id=${malId}`);
    
    if (catalogResponse.ok) {
      const catalogData = await catalogResponse.json();
      if (catalogData.success && catalogData.data) {
        // Salvar no cache IndexedDB
        await cacheCatalogAnime(malId, catalogData.data, 'catalog');
        return { anime: catalogData.data, source: 'catalog' };
      }
    }
  } catch (error) {
    console.warn(`[AnimeWithFallback] Erro ao buscar do catálogo (mal_id: ${malId}):`, error);
  }

  // 3. Fallback para Jikan API
  try {
    // Rate limiting básico - aguardar um pouco antes de chamar Jikan
    await new Promise(resolve => setTimeout(resolve, 350));
    
    const jikanResponse = await fetch(`${JIKAN_API_URL}/anime/${malId}`);
    
    if (jikanResponse.ok) {
      const jikanData = await jikanResponse.json();
      if (jikanData.data) {
        const convertedAnime = jikanToCatalogAnime(jikanData.data);
        // Salvar no cache IndexedDB
        await cacheCatalogAnime(malId, convertedAnime as unknown as Record<string, unknown>, 'jikan');
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
 * Prioriza cache local para máxima performance offline
 */
export function useAnimesWithFallback(malIds: number[]) {
  return useQuery({
    queryKey: ['animes-with-fallback', malIds.sort().join(',')],
    queryFn: async () => {
      const results: Map<number, { anime: CatalogAnime | null; source: 'catalog' | 'jikan' | 'local' | null }> = new Map();
      const uncachedIds: number[] = [];
      
      // 1. Primeiro, verificar cache local para todos os IDs
      for (const malId of malIds) {
        try {
          const cached = await getCachedCatalogAnime(malId);
          if (cached) {
            results.set(malId, { 
              anime: cached.data as unknown as CatalogAnime, 
              source: 'local' 
            });
          } else {
            uncachedIds.push(malId);
          }
        } catch {
          uncachedIds.push(malId);
        }
      }
      
      console.log(`[AnimesWithFallback] Cache: ${malIds.length - uncachedIds.length}/${malIds.length} | Buscar: ${uncachedIds.length}`);
      
      // 2. Buscar apenas os não-cacheados em lotes
      const batchSize = 3;
      for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(malId => fetchAnimeWithFallback(malId))
        );
        
        batch.forEach((malId, index) => {
          results.set(malId, batchResults[index]);
        });
        
        // Aguardar entre lotes para rate limiting
        if (i + batchSize < uncachedIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return results;
    },
    enabled: malIds.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  });
}

/**
 * Pré-carrega animes no cache em background
 * Útil para preparar dados para modo offline
 */
export async function prefetchAnimesToCache(malIds: number[]): Promise<{
  cached: number;
  fetched: number;
  failed: number;
}> {
  let cached = 0;
  let fetched = 0;
  let failed = 0;
  
  const uncachedIds: number[] = [];
  
  // Verificar quais já estão em cache
  for (const malId of malIds) {
    try {
      const existing = await getCachedCatalogAnime(malId);
      if (existing) {
        cached++;
      } else {
        uncachedIds.push(malId);
      }
    } catch {
      uncachedIds.push(malId);
    }
  }
  
  // Buscar os não-cacheados em lotes pequenos
  const batchSize = 2;
  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    const batch = uncachedIds.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(malId => fetchAnimeWithFallback(malId))
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.anime) {
        fetched++;
      } else {
        failed++;
      }
    });
    
    // Delay maior para não sobrecarregar APIs
    if (i + batchSize < uncachedIds.length) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  
  console.log(`[PrefetchCache] Resultado: ${cached} em cache, ${fetched} buscados, ${failed} falhas`);
  return { cached, fetched, failed };
}
