/**
 * Hook para busca avançada de animes no catálogo
 * Suporta filtros por gênero, estúdio, ano, tipo e ordenação
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import type { CatalogAnime, AnimeFilters, AnimeSortOptions } from '@/types/catalog';

// URL da API externa de animes
const API_URL = 'https://xhyairbedwqezegopjan.supabase.co/functions/v1/anime-api';

// Interface para os filtros avançados da página Descobrir
export interface DiscoverFilters {
  search?: string;
  genre?: number;
  studio?: number;
  yearMin?: number;
  yearMax?: number;
  type?: string;
  status?: string;
  scoreMin?: number;
}

// Opções de ordenação para descobrir
export interface DiscoverSort {
  field: 'score' | 'popularity' | 'year' | 'title';
  order: 'asc' | 'desc';
}

/**
 * Converte filtros do Discover para parâmetros da API
 */
function filtersToParams(filters: DiscoverFilters): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.genre) params.genre = String(filters.genre);
  if (filters.studio) params.studio = String(filters.studio);
  if (filters.yearMin) params.year_min = String(filters.yearMin);
  if (filters.yearMax) params.year_max = String(filters.yearMax);
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  if (filters.scoreMin) params.score_min = String(filters.scoreMin);
  
  return params;
}

/**
 * Busca animes na API com os parâmetros especificados
 */
async function fetchAnimes(params: Record<string, string | number | undefined>) {
  const url = new URL(API_URL);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Hook para busca avançada com scroll infinito
 */
export function useAdvancedAnimeSearch(
  filters: DiscoverFilters,
  sort: DiscoverSort = { field: 'score', order: 'desc' },
  limit = 24
) {
  // Verifica se há algum filtro ativo
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.genre ||
    filters.studio ||
    filters.yearMin ||
    filters.yearMax ||
    filters.type ||
    filters.status ||
    filters.scoreMin
  );

  return useInfiniteQuery({
    queryKey: ['anime-catalog', 'advanced-search', filters, sort],
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        ...filtersToParams(filters),
        page: pageParam,
        limit,
        sort: sort.field,
        order: sort.order,
      };
      
      const response = await fetchAnimes(params);
      return {
        data: (response.data || []) as CatalogAnime[],
        pagination: response.pagination,
        nextPage: response.pagination?.has_next ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: hasActiveFilters,
    staleTime: 5 * 60 * 1000,
  });
}

// Tipos de anime disponíveis
export const ANIME_TYPES = [
  { value: 'TV', label: 'TV' },
  { value: 'Movie', label: 'Filme' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'Special', label: 'Especial' },
  { value: 'Music', label: 'Música' },
];

// Status de exibição
export const ANIME_STATUSES = [
  { value: 'Airing', label: 'Em Exibição' },
  { value: 'Finished Airing', label: 'Finalizado' },
  { value: 'Not yet aired', label: 'Não Lançado' },
];

// Anos disponíveis (de 1960 até o ano atual + 1)
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear + 1; year >= 1960; year--) {
    years.push(year);
  }
  return years;
}
