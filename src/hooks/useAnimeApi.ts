/**
 * Hook para consumir a API do catálogo de animes
 * Catálogo com 9.839 animes pré-carregados, sinopses em PT-BR e imagens locais
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type {
  CatalogAnime,
  AnimeFilters,
  AnimePagination,
  AnimeSortOptions,
  ApiResponse,
  CatalogStats,
  GenreItem,
  StudioItem,
} from '@/types/catalog';
import { CATALOG_API_URL } from '@/lib/apiConfig';

// Usar URL centralizada
const API_URL = CATALOG_API_URL;

/**
 * Função genérica para chamar a API
 */
async function fetchAnimeApi<T>(params: Record<string, string | number | undefined> = {}): Promise<ApiResponse<T>> {
  const url = new URL(API_URL);
  
  // Adicionar parâmetros não-undefined
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  
  // Para 404 (anime não encontrado), retornar objeto vazio ao invés de lançar erro
  // Isso é importante porque usuários podem ter animes na lista que não existem na nova API
  if (response.status === 404) {
    return { success: false, data: undefined };
  }
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Converter filtros para parâmetros de URL
 */
function filtersToParams(filters: AnimeFilters): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.status) {
    params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
  }
  if (filters.type) {
    params.type = Array.isArray(filters.type) ? filters.type.join(',') : filters.type;
  }
  if (filters.season) {
    params.season = Array.isArray(filters.season) ? filters.season.join(',') : filters.season;
  }
  if (filters.genre !== undefined) params.genre = String(filters.genre);
  if (filters.studio !== undefined) params.studio = String(filters.studio);
  if (filters.year_min) params.year_min = String(filters.year_min);
  if (filters.year_max) params.year_max = String(filters.year_max);
  if (filters.score_min) params.score_min = String(filters.score_min);
  if (filters.score_max) params.score_max = String(filters.score_max);
  if (filters.has_image !== undefined) params.has_image = String(filters.has_image);
  
  return params;
}

/**
 * Hook para listar animes com filtros e paginação
 */
export function useAnimeList(
  filters: AnimeFilters = {},
  pagination: AnimePagination = { page: 1, limit: 24 },
  sort: AnimeSortOptions = { field: 'score', order: 'desc' }
) {
  return useQuery({
    queryKey: ['anime-catalog', 'list', filters, pagination, sort],
    queryFn: async () => {
      const params = {
        ...filtersToParams(filters),
        page: pagination.page,
        limit: pagination.limit,
        sort: sort.field,
        order: sort.order,
      };
      
      const response = await fetchAnimeApi<CatalogAnime[]>(params);
      return {
        data: response.data || [],
        pagination: response.pagination,
      };
    },
    // Cache de 15 minutos - dados do catálogo mudam pouco
    staleTime: 15 * 60 * 1000,
    // Mantém dados em cache por 1 hora
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook para scroll infinito de animes
 */
export function useInfiniteAnimeList(
  filters: AnimeFilters = {},
  sort: AnimeSortOptions = { field: 'score', order: 'desc' },
  limit = 24
) {
  return useInfiniteQuery({
    queryKey: ['anime-catalog', 'infinite', filters, sort],
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        ...filtersToParams(filters),
        page: pageParam,
        limit,
        sort: sort.field,
        order: sort.order,
      };
      
      const response = await fetchAnimeApi<CatalogAnime[]>(params);
      return {
        data: response.data || [],
        pagination: response.pagination,
        nextPage: response.pagination?.has_next ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    // Cache de 15 minutos para scroll infinito
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook para buscar anime por ID interno (UUID)
 */
export function useAnimeById(id: string | null) {
  return useQuery({
    queryKey: ['anime-catalog', 'by-id', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetchAnimeApi<CatalogAnime>({ id });
      return response.data || null;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para buscar anime por MAL ID
 */
export function useAnimeByMalId(malId: number | null) {
  return useQuery({
    queryKey: ['anime-catalog', 'by-mal-id', malId],
    queryFn: async () => {
      if (!malId) return null;
      const response = await fetchAnimeApi<CatalogAnime>({ mal_id: malId });
      return response.data || null;
    },
    enabled: !!malId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para busca por texto (scroll infinito)
 */
export function useSearchAnimes(query: string, limit = 24) {
  return useInfiniteQuery({
    queryKey: ['anime-catalog', 'search', query],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchAnimeApi<CatalogAnime[]>({
        search: query,
        page: pageParam,
        limit,
      });
      return {
        data: response.data || [],
        pagination: response.pagination,
        nextPage: response.pagination?.has_next ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: query.length >= 2,
    // Cache de 10 minutos para resultados de busca
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook para busca simples por texto (primeira página)
 */
export function useSimpleSearchAnimes(query: string, limit = 12) {
  return useQuery({
    queryKey: ['anime-catalog', 'simple-search', query],
    queryFn: async () => {
      const response = await fetchAnimeApi<CatalogAnime[]>({
        search: query,
        page: 1,
        limit,
      });
      return response.data || [];
    },
    enabled: query.length >= 2,
    // Cache de 10 minutos para busca simples
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook para animes por gênero (scroll infinito)
 */
export function useAnimesByGenre(genreId: number | null, limit = 24) {
  return useInfiniteQuery({
    queryKey: ['anime-catalog', 'by-genre', genreId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchAnimeApi<CatalogAnime[]>({
        genre: genreId!,
        page: pageParam,
        limit,
        sort: 'score',
        order: 'desc',
      });
      return {
        data: response.data || [],
        pagination: response.pagination,
        nextPage: response.pagination?.has_next ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: !!genreId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para animes da temporada atual (em exibição)
 */
export function useSeasonAnimes(limit = 24) {
  return useInfiniteQuery({
    queryKey: ['anime-catalog', 'season', 'airing'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchAnimeApi<CatalogAnime[]>({
        status: 'Airing', // Nova API usa 'Airing' ao invés de 'Currently Airing'
        page: pageParam,
        limit,
        sort: 'popularity',
        order: 'asc',
      });
      return {
        data: response.data || [],
        pagination: response.pagination,
        nextPage: response.pagination?.has_next ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para top animes por score (scroll infinito)
 */
export function useTopAnimes(limit = 24) {
  return useInfiniteQuery({
    queryKey: ['anime-catalog', 'top'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchAnimeApi<CatalogAnime[]>({
        page: pageParam,
        limit,
        sort: 'score',
        order: 'desc',
        score_min: 7, // Apenas animes bem avaliados
      });
      return {
        data: response.data || [],
        pagination: response.pagination,
        nextPage: response.pagination?.has_next ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para estatísticas do catálogo
 */
export function useAnimeStats() {
  return useQuery({
    queryKey: ['anime-catalog', 'stats'],
    queryFn: async () => {
      const response = await fetchAnimeApi<CatalogStats>({ action: 'stats' });
      return response.data || null;
    },
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
}

/**
 * Hook para listar todos os gêneros
 */
export function useAnimeGenres() {
  return useQuery({
    queryKey: ['anime-catalog', 'genres'],
    queryFn: async () => {
      const response = await fetchAnimeApi<GenreItem[]>({ action: 'genres' });
      return response.data || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hora
  });
}

/**
 * Hook para listar todos os estúdios
 */
export function useAnimeStudios() {
  return useQuery({
    queryKey: ['anime-catalog', 'studios'],
    queryFn: async () => {
      const response = await fetchAnimeApi<StudioItem[]>({ action: 'studios' });
      return response.data || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hora
  });
}

/**
 * Hook para verificar se o catálogo está populado
 */
export function useCatalogStatus() {
  return useQuery({
    queryKey: ['anime-catalog', 'status'],
    queryFn: async () => {
      const response = await fetchAnimeApi<CatalogStats>({ action: 'stats' });
      const stats = response.data;
      
      return {
        isPopulated: (stats?.total_anime || 0) > 0,
        totalAnimes: stats?.total_anime || 0,
        lastSync: stats?.last_sync || null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar detalhes de um anime (compatibilidade com código legado)
 */
export function useAnimeDetails(malId: number) {
  return useQuery({
    queryKey: ['anime-catalog', 'details', malId],
    queryFn: async () => {
      if (!malId || malId <= 0) return null;
      const response = await fetchAnimeApi<CatalogAnime>({ mal_id: malId });
      return response.data ? { data: response.data } : null;
    },
    enabled: malId > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// Exportar gêneros populares para uso em filtros
export const POPULAR_GENRES = [
  { mal_id: 1, name: 'Action' },
  { mal_id: 2, name: 'Adventure' },
  { mal_id: 4, name: 'Comedy' },
  { mal_id: 8, name: 'Drama' },
  { mal_id: 10, name: 'Fantasy' },
  { mal_id: 22, name: 'Romance' },
  { mal_id: 24, name: 'Sci-Fi' },
  { mal_id: 36, name: 'Slice of Life' },
  { mal_id: 30, name: 'Sports' },
  { mal_id: 37, name: 'Supernatural' },
  { mal_id: 7, name: 'Mystery' },
  { mal_id: 14, name: 'Horror' },
];
