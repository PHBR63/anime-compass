import { useMemo } from 'react';
import { useAnimeEntries } from './useAnimeEntries';
import { useQueries } from '@tanstack/react-query';
import { CATALOG_API_URL } from '@/lib/apiConfig';

/**
 * Interface para gênero/estúdio favorito
 */
interface GenreStudio {
  id: number;
  name: string;
  count: number;
}

interface FavoriteStats {
  genres: GenreStudio[];
  studios: GenreStudio[];
  isPartial: boolean;
}

/**
 * Busca anime do catálogo local
 */
async function fetchAnimeFromCatalog(malId: number) {
  try {
    const response = await fetch(`${CATALOG_API_URL}?mal_id=${malId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch {
    // Silenciar erro
  }
  return null;
}

/**
 * Hook para calcular gêneros e estúdios favoritos baseado no histórico de animes
 * Usa apenas a API do catálogo local (sem fallback externo)
 */
export function useFavoriteGenresStudios() {
  const { data: entries } = useAnimeEntries();

  // Prioriza animes completados e assistindo, limita a 20
  const prioritizedEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    
    return [...entries]
      .sort((a, b) => {
        const priority = { completed: 0, watching: 1, paused: 2, dropped: 3, not_started: 4 };
        return (priority[a.status] || 4) - (priority[b.status] || 4);
      })
      .slice(0, 20);
  }, [entries]);

  // Buscar detalhes de cada anime do catálogo
  const animeQueries = useQueries({
    queries: prioritizedEntries.map(entry => ({
      queryKey: ['anime-catalog', 'favorites', entry.mal_id],
      queryFn: () => fetchAnimeFromCatalog(entry.mal_id),
      staleTime: 1000 * 60 * 60, // 1 hora
      enabled: !!entry.mal_id,
    })),
  });

  // Calcular gêneros e estúdios favoritos
  const stats = useMemo((): FavoriteStats => {
    const genreMap = new Map<number, { name: string; count: number }>();
    const studioMap = new Map<number, { name: string; count: number }>();
    let fetchedCount = 0;

    animeQueries.forEach(query => {
      const anime = query.data;
      if (!anime) return;
      
      fetchedCount++;

      // Contabiliza gêneros
      const genres = anime.genres as { mal_id: number; name: string }[] | null;
      genres?.forEach((genre) => {
        const existing = genreMap.get(genre.mal_id);
        if (existing) {
          existing.count++;
        } else {
          genreMap.set(genre.mal_id, { name: genre.name, count: 1 });
        }
      });

      // Contabiliza estúdios
      const studios = anime.studios as { mal_id: number; name: string }[] | null;
      studios?.forEach((studio) => {
        const existing = studioMap.get(studio.mal_id);
        if (existing) {
          existing.count++;
        } else {
          studioMap.set(studio.mal_id, { name: studio.name, count: 1 });
        }
      });
    });

    // Converte para arrays e ordena por contagem
    const genresArray: GenreStudio[] = Array.from(genreMap.entries())
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const studiosArray: GenreStudio[] = Array.from(studioMap.entries())
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      genres: genresArray,
      studios: studiosArray,
      isPartial: fetchedCount < (entries?.length || 0),
    };
  }, [animeQueries, entries?.length]);

  const isLoading = animeQueries.some(q => q.isLoading);
  const isError = animeQueries.every(q => q.isError);

  return {
    data: stats,
    isLoading,
    isError,
  };
}
