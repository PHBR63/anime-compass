import { useQuery } from '@tanstack/react-query';
import { fetchWithRateLimit } from '@/lib/jikanRateLimiter';

/**
 * Interface para relação de anime da Jikan API
 */
interface JikanRelation {
  relation: string;
  entry: {
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }[];
}

interface AnimeRelationsResponse {
  data: JikanRelation[];
}

export interface AnimeRelation {
  malId: number;
  name: string;
  type: string;
  relationType: string;
}

/**
 * Tipos de relação que queremos buscar
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
 * Hook para buscar relações de um anime da Jikan API
 * @param malId - ID do anime no MyAnimeList
 */
export function useAnimeRelations(malId: number | null) {
  return useQuery({
    queryKey: ['anime-relations', malId],
    queryFn: async (): Promise<AnimeRelation[]> => {
      if (!malId) return [];
      
      const response = await fetchWithRateLimit(
        `https://api.jikan.moe/v4/anime/${malId}/relations`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar relações');
      }
      
      const data: AnimeRelationsResponse = await response.json();
      
      // Filtrar e mapear relações relevantes
      const relations: AnimeRelation[] = [];
      
      for (const relation of data.data) {
        if (RELEVANT_RELATIONS.includes(relation.relation)) {
          for (const entry of relation.entry) {
            // Apenas animes (não manga, light novel, etc)
            if (entry.type === 'anime') {
              relations.push({
                malId: entry.mal_id,
                name: entry.name,
                type: entry.type,
                relationType: relation.relation,
              });
            }
          }
        }
      }
      
      return relations;
    },
    enabled: !!malId,
    staleTime: 1000 * 60 * 60 * 24, // Cache por 24 horas
    gcTime: 1000 * 60 * 60 * 24 * 7, // Manter no cache por 7 dias
    retry: 1,
  });
}

/**
 * Hook para buscar relações de múltiplos animes
 * Útil para validar agrupamentos de franquia
 */
export function useMultipleAnimeRelations(malIds: number[]) {
  return useQuery({
    queryKey: ['anime-relations-batch', malIds.sort().join(',')],
    queryFn: async (): Promise<Map<number, AnimeRelation[]>> => {
      const relationsMap = new Map<number, AnimeRelation[]>();
      
      // Buscar em série com delay para evitar rate limiting
      for (const malId of malIds.slice(0, 5)) { // Limitar a 5 para não sobrecarregar
        try {
          const response = await fetchWithRateLimit(
            `https://api.jikan.moe/v4/anime/${malId}/relations`
          );
          
          if (response.ok) {
            const data: AnimeRelationsResponse = await response.json();
            const relations: AnimeRelation[] = [];
            
            for (const relation of data.data) {
              if (RELEVANT_RELATIONS.includes(relation.relation)) {
                for (const entry of relation.entry) {
                  if (entry.type === 'anime') {
                    relations.push({
                      malId: entry.mal_id,
                      name: entry.name,
                      type: entry.type,
                      relationType: relation.relation,
                    });
                  }
                }
              }
            }
            
            relationsMap.set(malId, relations);
          }
        } catch (error) {
          console.warn(`Erro ao buscar relações para ${malId}:`, error);
        }
      }
      
      return relationsMap;
    },
    enabled: malIds.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 0,
  });
}
