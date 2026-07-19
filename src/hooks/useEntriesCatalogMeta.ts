import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Metadados de catálogo por mal_id — usado para enriquecer filtros da Minha Lista
 * com informações como gêneros, estúdios, tipo e ano que não estão em anime_entries.
 */
export interface CatalogMeta {
  genres: string[];
  studios: string[];
  type: string | null;
  year: number | null;
}

type JsonNamed = { name?: string } | null | undefined;

/**
 * Busca metadados do catálogo (gêneros, estúdios, tipo, ano) para uma lista
 * de mal_ids em uma única consulta e retorna um Map<mal_id, CatalogMeta>.
 */
export function useEntriesCatalogMeta(malIds: number[]) {
  // Deduplica e ordena para manter a chave da query estável
  const uniqueIds = useMemo(
    () => Array.from(new Set(malIds.filter((id) => typeof id === 'number'))).sort((a, b) => a - b),
    [malIds]
  );

  const query = useQuery({
    queryKey: ['entries-catalog-meta', uniqueIds],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map<number, CatalogMeta>();

      const map = new Map<number, CatalogMeta>();

      // Consulta em lotes para evitar URLs muito longas em .in()
      const CHUNK = 500;
      for (let i = 0; i < uniqueIds.length; i += CHUNK) {
        const chunk = uniqueIds.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('anime_catalog')
          .select('mal_id, genres, studios, type, year')
          .in('mal_id', chunk);

        if (error) throw error;

        (data ?? []).forEach((row) => {
          const genres = Array.isArray(row.genres)
            ? (row.genres as JsonNamed[])
                .map((g) => g?.name)
                .filter((n): n is string => typeof n === 'string')
            : [];
          const studios = Array.isArray(row.studios)
            ? (row.studios as JsonNamed[])
                .map((s) => s?.name)
                .filter((n): n is string => typeof n === 'string')
            : [];
          map.set(row.mal_id as number, {
            genres,
            studios,
            type: (row.type as string | null) ?? null,
            year: (row.year as number | null) ?? null,
          });
        });
      }

      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 1000 * 60 * 30, // 30 min
  });

  // Deriva listas de opções disponíveis para os filtros
  const options = useMemo(() => {
    const meta = query.data ?? new Map<number, CatalogMeta>();
    const genresSet = new Set<string>();
    const studiosSet = new Set<string>();
    const typesSet = new Set<string>();
    const yearsSet = new Set<number>();

    meta.forEach((m) => {
      m.genres.forEach((g) => genresSet.add(g));
      m.studios.forEach((s) => studiosSet.add(s));
      if (m.type) typesSet.add(m.type);
      if (m.year) yearsSet.add(m.year);
    });

    return {
      genres: Array.from(genresSet).sort((a, b) => a.localeCompare(b)),
      studios: Array.from(studiosSet).sort((a, b) => a.localeCompare(b)),
      types: Array.from(typesSet).sort((a, b) => a.localeCompare(b)),
      years: Array.from(yearsSet).sort((a, b) => b - a),
    };
  }, [query.data]);

  return {
    metaMap: query.data ?? new Map<number, CatalogMeta>(),
    options,
    isLoading: query.isLoading,
  };
}
