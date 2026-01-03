import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { CATALOG_API_URL } from '@/lib/apiConfig';

// Interface para estatísticas detalhadas do usuário
interface GenreStat {
  name: string;
  count: number;
  percentage: number;
}

interface StudioStat {
  name: string;
  count: number;
  percentage: number;
}

interface TimeStats {
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  formattedShort: string;
  formattedLong: string;
}

export interface DetailedStats {
  time: TimeStats;
  genres: GenreStat[];
  studios: StudioStat[];
  totalAnimes: number;
  completedAnimes: number;
  averageEpisodesPerAnime: number;
}

/**
 * Busca detalhes de um anime do catálogo local
 */
const fetchAnimeFromCatalog = async (malId: number): Promise<{ genres: string[]; studios: string[] } | null> => {
  try {
    const response = await fetch(`${CATALOG_API_URL}?mal_id=${malId}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.success && data.data) {
      return {
        genres: data.data.genres?.map((g: { name: string }) => g.name) || [],
        studios: data.data.studios?.map((s: { name: string }) => s.name) || [],
      };
    }
    return null;
  } catch {
    return null;
  }
};

// Hook para buscar estatísticas detalhadas do usuário
export function useDetailedStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['detailed-stats', user?.id],
    queryFn: async (): Promise<DetailedStats> => {
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar todas as entradas do usuário
      const { data: entries, error } = await supabase
        .from('anime_entries')
        .select('mal_id, episodes_watched, status, total_episodes')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (error) throw error;

      // Calcular tempo total (média de 24 min por episódio)
      const totalEpisodes = entries?.reduce((sum, e) => sum + (e.episodes_watched || 0), 0) || 0;
      const totalMinutes = totalEpisodes * 24;
      const totalHours = Math.floor(totalMinutes / 60);
      const totalDays = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      const remainingMinutes = totalMinutes % 60;

      const timeStats: TimeStats = {
        totalMinutes,
        totalHours,
        totalDays,
        formattedShort: totalDays > 0 
          ? `${totalDays}d ${remainingHours}h` 
          : totalHours > 0 
            ? `${totalHours}h ${remainingMinutes}m`
            : `${totalMinutes}m`,
        formattedLong: totalDays > 0
          ? `${totalDays} dias, ${remainingHours} horas`
          : totalHours > 0
            ? `${totalHours} horas, ${remainingMinutes} minutos`
            : `${totalMinutes} minutos`,
      };

      // Buscar gêneros e estúdios do catálogo local
      const genreCounts: Record<string, number> = {};
      const studioCounts: Record<string, number> = {};

      // Buscar detalhes de até 20 animes para estatísticas
      const animesToFetch = entries?.slice(0, 20) || [];
      
      // Buscar em paralelo (catálogo local não tem rate limit)
      const results = await Promise.all(
        animesToFetch.map(entry => fetchAnimeFromCatalog(entry.mal_id))
      );
      
      results.forEach(details => {
        if (details) {
          details.genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
          details.studios.forEach(studio => {
            studioCounts[studio] = (studioCounts[studio] || 0) + 1;
          });
        }
      });

      // Ordenar e calcular percentuais de gêneros
      const totalGenreEntries = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
      const genres: GenreStat[] = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalGenreEntries) * 100),
        }));

      // Ordenar e calcular percentuais de estúdios
      const totalStudioEntries = Object.values(studioCounts).reduce((a, b) => a + b, 0) || 1;
      const studios: StudioStat[] = Object.entries(studioCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalStudioEntries) * 100),
        }));

      const completedAnimes = entries?.filter(e => e.status === 'completed').length || 0;

      return {
        time: timeStats,
        genres,
        studios,
        totalAnimes: entries?.length || 0,
        completedAnimes,
        averageEpisodesPerAnime: entries?.length 
          ? Math.round(totalEpisodes / entries.length) 
          : 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}
