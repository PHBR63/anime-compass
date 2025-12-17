import { useQuery } from '@tanstack/react-query';
import { useAnimeEntries } from './useAnimeEntries';
import { jikanCache, cacheKeys, CACHE_TTL } from '@/lib/jikanCache';
import { fetchWithRateLimit } from '@/lib/jikanRateLimiter';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

interface GenreStudio {
  id: number;
  name: string;
  count: number;
}

interface FavoriteStats {
  genres: GenreStudio[];
  studios: GenreStudio[];
  isPartial: boolean; // Indica se os dados são parciais (nem todos os animes foram buscados)
}

/**
 * Busca detalhes de um anime com cache
 */
const fetchAnimeDetails = async (malId: number) => {
  const cacheKey = cacheKeys.animeDetails(malId);
  const cached = jikanCache.get<{ data: { genres: { mal_id: number; name: string }[]; studios: { mal_id: number; name: string }[] } }>(cacheKey);
  
  if (cached) {
    return cached.data;
  }

  const response = await fetchWithRateLimit(`${JIKAN_BASE_URL}/anime/${malId}`);
  if (!response.ok) {
    if (response.status === 429) {
      // Rate limited - retorna null para pular este anime
      return null;
    }
    throw new Error(`Erro ao buscar anime ${malId}`);
  }
  
  const result = await response.json();
  jikanCache.set(cacheKey, result, CACHE_TTL.ANIME_DETAILS);
  
  return result.data;
};

/**
 * Hook para calcular gêneros e estúdios favoritos baseado no histórico de animes
 * Limita a busca para evitar sobrecarga na API
 */
export function useFavoriteGenresStudios() {
  const { data: entries } = useAnimeEntries();

  return useQuery<FavoriteStats>({
    queryKey: ['favorite-genres-studios', entries?.map(e => e.mal_id).join(',')],
    queryFn: async () => {
      if (!entries || entries.length === 0) {
        return { genres: [], studios: [], isPartial: false };
      }

      // Prioriza animes completados e assistindo, limita a 20 para não sobrecarregar a API
      const sortedEntries = [...entries]
        .sort((a, b) => {
          const priority = { completed: 0, watching: 1, paused: 2, dropped: 3, not_started: 4 };
          return (priority[a.status] || 4) - (priority[b.status] || 4);
        })
        .slice(0, 20);

      const genreMap = new Map<number, { name: string; count: number }>();
      const studioMap = new Map<number, { name: string; count: number }>();
      let fetchedCount = 0;

      // Busca detalhes dos animes com delay entre requisições
      for (const entry of sortedEntries) {
        try {
          const details = await fetchAnimeDetails(entry.mal_id);
          
          if (details) {
            fetchedCount++;
            
            // Contabiliza gêneros
            details.genres?.forEach((genre: { mal_id: number; name: string }) => {
              const existing = genreMap.get(genre.mal_id);
              if (existing) {
                existing.count++;
              } else {
                genreMap.set(genre.mal_id, { name: genre.name, count: 1 });
              }
            });

            // Contabiliza estúdios
            details.studios?.forEach((studio: { mal_id: number; name: string }) => {
              const existing = studioMap.get(studio.mal_id);
              if (existing) {
                existing.count++;
              } else {
                studioMap.set(studio.mal_id, { name: studio.name, count: 1 });
              }
            });
          }

          // Pequeno delay entre requisições para respeitar rate limit
          await new Promise(resolve => setTimeout(resolve, 350));
        } catch (error) {
          console.warn(`Erro ao buscar detalhes do anime ${entry.mal_id}:`, error);
        }
      }

      // Converte para arrays e ordena por contagem
      const genres: GenreStudio[] = Array.from(genreMap.entries())
        .map(([id, { name, count }]) => ({ id, name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const studios: GenreStudio[] = Array.from(studioMap.entries())
        .map(([id, { name, count }]) => ({ id, name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      return {
        genres,
        studios,
        isPartial: fetchedCount < entries.length,
      };
    },
    enabled: !!entries && entries.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
