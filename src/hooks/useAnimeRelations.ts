import { useQuery } from '@tanstack/react-query';

/**
 * Interface para relação de anime
 */
export interface AnimeRelation {
  malId: number;
  name: string;
  type: string;
  relationType: string;
}

/**
 * Tipos de relação relevantes
 */
const RELEVANT_RELATIONS = [
  'Sequel',
  'Prequel',
  'Side story',
  'Parent story',
  'Spin-off',
  'Alternative version',
  'Alternative setting',
];

/**
 * Hook para buscar relações de um anime
 * Nota: A nova API não fornece relações diretamente,
 * então retornamos array vazio por enquanto
 * TODO: Implementar endpoint de relações na API externa se necessário
 */
export function useAnimeRelations(malId: number | null) {
  return useQuery({
    queryKey: ['anime-relations', malId],
    queryFn: async (): Promise<AnimeRelation[]> => {
      // A API externa não possui endpoint de relações ainda
      // Retorna array vazio para manter compatibilidade
      return [];
    },
    enabled: !!malId,
    staleTime: 1000 * 60 * 60 * 24, // Cache por 24 horas
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}

/**
 * Hook para buscar relações de múltiplos animes
 */
export function useMultipleAnimeRelations(malIds: number[]) {
  return useQuery({
    queryKey: ['anime-relations-batch', malIds.sort().join(',')],
    queryFn: async (): Promise<Map<number, AnimeRelation[]>> => {
      // A API externa não possui endpoint de relações ainda
      return new Map();
    },
    enabled: malIds.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}
