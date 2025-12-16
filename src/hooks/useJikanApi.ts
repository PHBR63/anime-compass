import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

// Tipos da API Jikan
export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  synopsis: string | null;
  score: number | null;
  scored_by: number | null;
  episodes: number | null;
  status: string;
  year: number | null;
  season: string | null;
  genres: { mal_id: number; name: string }[];
  studios: { mal_id: number; name: string }[];
  type: string;
  rating: string | null;
  popularity: number;
  members: number;
}

interface JikanResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
  };
}

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Ratings e tipos a serem filtrados
const EXCLUDED_RATINGS = ['Rx - Hentai'];
const EXCLUDED_TYPES = ['Music'];

// Função para filtrar animes indesejados
const filterAnimes = (animes: JikanAnime[]): JikanAnime[] => {
  return animes.filter(anime => {
    // Filtra por rating (exclui Hentai)
    if (anime.rating && EXCLUDED_RATINGS.includes(anime.rating)) {
      return false;
    }
    // Filtra por tipo (exclui Music)
    if (anime.type && EXCLUDED_TYPES.includes(anime.type)) {
      return false;
    }
    return true;
  });
};

// Função para buscar com rate limiting (Jikan tem limite de 3 req/s)
const fetchWithDelay = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Erro ao buscar dados da API');
  }
  return response.json();
};

// Função para buscar e filtrar resultados
const fetchAndFilter = async <T extends { data: JikanAnime[] }>(url: string): Promise<T> => {
  const result = await fetchWithDelay(url);
  if (result.data && Array.isArray(result.data)) {
    result.data = filterAnimes(result.data);
  }
  return result;
};

// Hook para buscar animes em alta (simples)
export function useTopAnimes(page: number = 1) {
  return useQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'top', page],
    queryFn: () => fetchAndFilter(`${JIKAN_BASE_URL}/top/anime?page=${page}&limit=12`),
    staleTime: 1000 * 60 * 10,
  });
}

// Hook para buscar animes da temporada atual (simples)
export function useSeasonNow(page: number = 1) {
  return useQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'season', 'now', page],
    queryFn: () => fetchAndFilter(`${JIKAN_BASE_URL}/seasons/now?page=${page}&limit=12`),
    staleTime: 1000 * 60 * 10,
  });
}

// Hook infinito para Top Animes com paginação
export function useInfiniteTopAnimes() {
  return useInfiniteQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'top', 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      fetchAndFilter(`${JIKAN_BASE_URL}/top/anime?page=${pageParam}&limit=24`),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.has_next_page) {
        return (lastPage.pagination.current_page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 10,
  });
}

// Hook infinito para Temporada Atual com paginação
export function useInfiniteSeasonNow() {
  return useInfiniteQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'season', 'now', 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      fetchAndFilter(`${JIKAN_BASE_URL}/seasons/now?page=${pageParam}&limit=24`),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.has_next_page) {
        return (lastPage.pagination.current_page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 10,
  });
}

// Hook infinito para busca de animes
export function useInfiniteSearchAnimes(query: string) {
  return useInfiniteQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'search', 'infinite', query],
    queryFn: ({ pageParam = 1 }) => 
      fetchAndFilter(`${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&page=${pageParam}&limit=24&sfw=true`),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.has_next_page) {
        return (lastPage.pagination.current_page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook infinito para animes por gênero
export function useInfiniteAnimesByGenre(genreId: number) {
  return useInfiniteQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'genre', 'infinite', genreId],
    queryFn: ({ pageParam = 1 }) => 
      fetchAndFilter(`${JIKAN_BASE_URL}/anime?genres=${genreId}&page=${pageParam}&limit=24&order_by=score&sort=desc`),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.has_next_page) {
        return (lastPage.pagination.current_page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: genreId > 0,
    staleTime: 1000 * 60 * 10,
  });
}

// Hook para buscar animes por termo de pesquisa (simples)
export function useSearchAnimes(query: string, page: number = 1) {
  return useQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'search', query, page],
    queryFn: () => fetchAndFilter(`${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=12&sfw=true`),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook para buscar animes por gênero (simples)
export function useAnimesByGenre(genreId: number, page: number = 1) {
  return useQuery<JikanResponse<JikanAnime[]>>({
    queryKey: ['jikan', 'genre', genreId, page],
    queryFn: () => fetchAndFilter(`${JIKAN_BASE_URL}/anime?genres=${genreId}&page=${page}&limit=12&order_by=score&sort=desc`),
    enabled: genreId > 0,
    staleTime: 1000 * 60 * 10,
  });
}

// Hook para buscar detalhes de um anime específico
export function useAnimeDetails(malId: number) {
  return useQuery<JikanResponse<JikanAnime>>({
    queryKey: ['jikan', 'anime', malId],
    queryFn: () => fetchWithDelay(`${JIKAN_BASE_URL}/anime/${malId}`),
    enabled: malId > 0,
    staleTime: 1000 * 60 * 30,
  });
}

// Mapeamento de gêneros populares (IDs da API Jikan)
export const GENRES = [
  { id: 1, name: 'Ação' },
  { id: 2, name: 'Aventura' },
  { id: 4, name: 'Comédia' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasia' },
  { id: 22, name: 'Romance' },
  { id: 41, name: 'Suspense' },
  { id: 24, name: 'Sci-Fi' },
  { id: 36, name: 'Slice of Life' },
  { id: 30, name: 'Esportes' },
];
