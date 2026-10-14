/**
 * Hook para buscar dados de anime do catálogo local
 * Prioriza cache local → API do catálogo
 */

import { useQuery } from '@tanstack/react-query';
import type { CatalogAnime } from '@/types/catalog';
import { getCachedCatalogAnime, cacheCatalogAnime } from '@/lib/offlineCache';
import { CATALOG_API_URL } from '@/lib/apiConfig';
import { getAnnSource, isAnnCacheCurrent } from '@/lib/annMetadata';

// Resultado do hook com indicador de fonte
export interface AnimeWithSource {
  anime: CatalogAnime | null;
  source: 'catalog' | 'local' | 'cache' | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Busca anime primeiro no cache local, depois na API do catálogo
 */
async function fetchAnimeFromCatalog(malId: number): Promise<{ anime: CatalogAnime | null; source: 'catalog' | 'local' | null }> {
  let offlineFallback: CatalogAnime | null = null;
  // 1. Tentar buscar do cache IndexedDB primeiro
  try {
    const cached = await getCachedCatalogAnime(malId);
    if (cached) offlineFallback = cached.data as unknown as CatalogAnime;
    if (cached && isAnnCacheCurrent(malId, (cached.data as unknown as CatalogAnime).metadata_sources)) {
      console.log(`[AnimeWithFallback] Cache hit para mal_id: ${malId}`);
      return { anime: cached.data as unknown as CatalogAnime, source: 'local' };
    }
  } catch (error) {
    console.warn(`[AnimeWithFallback] Erro ao ler cache (mal_id: ${malId}):`, error);
  }

  // 2. Buscar na API do catálogo
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

  return offlineFallback ? { anime: offlineFallback, source: 'local' } : { anime: null, source: null };
}

/**
 * Hook para buscar anime por MAL ID do catálogo
 */
export function useAnimeWithFallback(malId: number | null): AnimeWithSource {
  const query = useQuery({
    queryKey: ['anime-catalog', malId, getAnnSource(malId)?.id ?? null],
    queryFn: async () => {
      if (!malId) return { anime: null, source: null };
      return fetchAnimeFromCatalog(malId);
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
 * Hook para buscar múltiplos animes do catálogo (para listas)
 * Prioriza cache local para máxima performance offline
 */
export function useAnimesWithFallback(malIds: number[]) {
  return useQuery({
    queryKey: ['animes-catalog', 'ann-20261014', malIds.sort().join(',')],
    queryFn: async () => {
      const results: Map<number, { anime: CatalogAnime | null; source: 'catalog' | 'local' | null }> = new Map();
      const uncachedIds: number[] = [];
      
      // 1. Primeiro, verificar cache local para todos os IDs
      for (const malId of malIds) {
        try {
          const cached = await getCachedCatalogAnime(malId);
          if (cached && isAnnCacheCurrent(malId, (cached.data as unknown as CatalogAnime).metadata_sources)) {
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
      const batchSize = 5;
      for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(malId => fetchAnimeFromCatalog(malId))
        );
        
        batch.forEach((malId, index) => {
          results.set(malId, batchResults[index]);
        });
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
      if (existing && isAnnCacheCurrent(malId, (existing.data as unknown as CatalogAnime).metadata_sources)) {
        cached++;
      } else {
        uncachedIds.push(malId);
      }
    } catch {
      uncachedIds.push(malId);
    }
  }
  
  // Buscar os não-cacheados em lotes
  const batchSize = 5;
  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    const batch = uncachedIds.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(malId => fetchAnimeFromCatalog(malId))
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.anime) {
        fetched++;
      } else {
        failed++;
      }
    });
  }
  
  console.log(`[PrefetchCache] Resultado: ${cached} em cache, ${fetched} buscados, ${failed} falhas`);
  return { cached, fetched, failed };
}
