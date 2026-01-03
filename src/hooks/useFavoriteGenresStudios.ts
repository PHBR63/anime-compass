import { useMemo } from 'react';
import { useAnimeEntries } from './useAnimeEntries';
import { useQueries } from '@tanstack/react-query';

// URLs das APIs
const CATALOG_API_URL = 'https://xhyairbedwqezegopjan.supabase.co/functions/v1/anime-api';
const JIKAN_API_URL = 'https://api.jikan.moe/v4';

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
 * Busca anime com fallback para Jikan
 */
async function fetchAnimeWithFallback(malId: number) {
  // Tentar catálogo primeiro
  try {
    const response = await fetch(`${CATALOG_API_URL}?mal_id=${malId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (e) {
    // Silenciar erro e tentar fallback
  }

  // Fallback para Jikan
  try {
    await new Promise(resolve => setTimeout(resolve, 350)); // Rate limiting
    const response = await fetch(`${JIKAN_API_URL}/anime/${malId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        // Converter formato Jikan
        return {
          ...data.data,
          genres: data.data.genres || [],
          studios: data.data.studios || [],
        };
      }
    }
  } catch (e) {
    // Silenciar erro
  }

  return null;
}

/**
 * Hook para calcular gêneros e estúdios favoritos baseado no histórico de animes
 * Usa a API do catálogo com fallback para Jikan
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

  // Buscar detalhes de cada anime com fallback
  const animeQueries = useQueries({
    queries: prioritizedEntries.map(entry => ({
      queryKey: ['anime-with-fallback', 'favorites', entry.mal_id],
      queryFn: () => fetchAnimeWithFallback(entry.mal_id),
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
