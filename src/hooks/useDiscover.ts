/**
 * Consultas da Descobrir: uma única consulta ativa (discover_catalog) com total
 * exato calculado no banco e facetas globais (discover_facets) do catálogo elegível.
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CatalogAnime } from '@/types/catalog';
import { useAuth } from '@/hooks/useAuth';

export const DISCOVER_PAGE_SIZE = 24;

/** Projeção reduzida usada nos cards (ficha completa só ao abrir o modal). */
export type DiscoverCardAnime = Pick<CatalogAnime,
  'id' | 'mal_id' | 'title' | 'title_english' | 'image_url' | 'local_image_url' | 'score' | 'type' | 'year' | 'season' | 'episodes' | 'status'>;

interface DiscoverPage {
  items: DiscoverCardAnime[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  hide_in_list_applied: boolean;
}

export interface FacetItem { name: string; count: number }
export interface DiscoverFacets {
  scope: 'catalogo_elegivel';
  total: number;
  genres: FacetItem[];
  studios: FacetItem[];
  types: { value: string; count: number }[];
  years: number[];
  statuses: { airing: number; finished: number; upcoming: number; unknown: number };
}

/** Lista paginada; o JWT da sessão vai junto e o banco decide quem é o usuário. */
export function useDiscoverCatalog(
  filters: Record<string, string | number | boolean>,
  sort: string,
  order: 'asc' | 'desc',
  enabled = true,
) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['discover-catalog', user?.id ?? null, filters, sort, order],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('discover_catalog', {
        p: filters, p_sort: sort, p_order: order, p_page: pageParam, p_limit: DISCOVER_PAGE_SIZE,
      });
      if (error) throw error;
      return data as unknown as DiscoverPage;
    },
    initialPageParam: 1,
    // Fim da lista vem do banco (has_next); nunca buscamos além do total.
    getNextPageParam: (last) => (last.has_next ? last.page + 1 : undefined),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/** Facetas globais (contagens do catálogo elegível inteiro, não do resultado filtrado). */
export function useDiscoverFacets() {
  return useQuery({
    queryKey: ['discover-facets', 'ann-20261014'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('discover_facets');
      if (error) throw error;
      return data as unknown as DiscoverFacets;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/** Remove duplicatas por mal_id preservando a ordem do servidor. */
export function dedupeByMalId<T extends { mal_id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((a) => (seen.has(a.mal_id) ? false : (seen.add(a.mal_id), true)));
}
