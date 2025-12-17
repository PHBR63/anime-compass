import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface para estatísticas globais do site
 */
interface GlobalStats {
  totalAnimes: number;
  totalEpisodes: number;
  totalHours: number;
  totalAchievements: number;
}

/**
 * Formata números grandes para exibição
 * Ex: 12181 -> "12.1k"
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace('.0', '') + 'k';
  }
  return num.toString();
};

/**
 * Hook para buscar estatísticas globais do site
 * Usado na landing page para mostrar dados reais
 */
export const useGlobalStats = () => {
  return useQuery({
    queryKey: ['global-stats'],
    queryFn: async (): Promise<GlobalStats> => {
      console.log('Buscando estatísticas globais...');
      
      const { data, error } = await supabase.functions.invoke('get-global-stats');

      if (error) {
        console.error('Erro ao buscar estatísticas globais:', error);
        throw error;
      }

      return data as GlobalStats;
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    gcTime: 1000 * 60 * 30, // Manter em cache por 30 minutos
    retry: 2,
  });
};
