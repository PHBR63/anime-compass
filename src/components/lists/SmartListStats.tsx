import { useMemo } from 'react';
import { Clock, Film, Star, TrendingUp, Tv, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AnimeEntry } from '@/lib/franchiseDetector';

interface SmartListStatsProps {
  /** Entradas selecionadas para a lista */
  entries: AnimeEntry[];
  /** Classes CSS adicionais */
  className?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
}

/**
 * Item individual de estatística
 */
function StatItem({ icon, label, value, subValue }: StatItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
      <div className="text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
        {subValue && (
          <p className="text-[10px] text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Componente de estatísticas em tempo real para listas inteligentes
 * Mostra métricas sobre os animes selecionados
 */
export function SmartListStats({ entries, className }: SmartListStatsProps) {
  // Calcula estatísticas baseadas nas entradas
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return {
        totalAnimes: 0,
        totalEpisodes: 0,
        watchedEpisodes: 0,
        estimatedHours: 0,
        averageRating: null,
        completedCount: 0,
        progressPercent: 0,
      };
    }

    // Total de episódios
    const totalEpisodes = entries.reduce((sum, e) => sum + (e.total_episodes || 0), 0);
    
    // Episódios assistidos
    const watchedEpisodes = entries.reduce((sum, e) => sum + (e.episodes_watched || 0), 0);
    
    // Tempo estimado (24 min por episódio)
    const estimatedMinutes = totalEpisodes * 24;
    const estimatedHours = Math.round(estimatedMinutes / 60);
    
    // Média de notas (apenas entradas com nota)
    const ratedEntries = entries.filter(e => e.rating !== null && e.rating !== undefined);
    const averageRating = ratedEntries.length > 0
      ? Math.round((ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length) * 10) / 10
      : null;
    
    // Contagem de completos
    const completedCount = entries.filter(e => e.status === 'completed').length;
    
    // Progresso geral
    const progressPercent = totalEpisodes > 0 
      ? Math.round((watchedEpisodes / totalEpisodes) * 100)
      : 0;

    return {
      totalAnimes: entries.length,
      totalEpisodes,
      watchedEpisodes,
      estimatedHours,
      averageRating,
      completedCount,
      progressPercent,
    };
  }, [entries]);

  // Conta tipos de animes
  const typeCounts = useMemo(() => {
    const counts = { series: 0, movies: 0, specials: 0 };
    
    entries.forEach(entry => {
      const title = entry.title.toLowerCase();
      if (title.includes('movie') || title.includes('film') || title.includes('gekijouban')) {
        counts.movies++;
      } else if (title.includes('ova') || title.includes('special') || title.includes('oad')) {
        counts.specials++;
      } else {
        counts.series++;
      }
    });
    
    return counts;
  }, [entries]);

  // Formata horas para exibição
  const formatHours = (hours: number): string => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} dias`;
    }
    return `${hours}h`;
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Grid de estatísticas */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem
          icon={<Tv className="h-4 w-4" />}
          label="Animes"
          value={stats.totalAnimes}
          subValue={`${typeCounts.series} séries • ${typeCounts.movies} filmes`}
        />
        <StatItem
          icon={<Film className="h-4 w-4" />}
          label="Episódios"
          value={stats.totalEpisodes.toLocaleString()}
          subValue={`${stats.watchedEpisodes.toLocaleString()} assistidos`}
        />
        <StatItem
          icon={<Clock className="h-4 w-4" />}
          label="Tempo Total"
          value={formatHours(stats.estimatedHours)}
          subValue="~24min/ep"
        />
        <StatItem
          icon={<Star className="h-4 w-4" />}
          label="Nota Média"
          value={stats.averageRating ?? '—'}
          subValue={stats.averageRating ? `de ${entries.filter(e => e.rating).length} avaliações` : 'Sem avaliações'}
        />
      </div>

      {/* Barra de progresso geral */}
      <div className="space-y-1.5 p-2 rounded-lg bg-secondary/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Progresso Geral</span>
          </div>
          <span className="font-medium">{stats.progressPercent}%</span>
        </div>
        <Progress value={stats.progressPercent} className="h-2" />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{stats.watchedEpisodes.toLocaleString()} / {stats.totalEpisodes.toLocaleString()} episódios</span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {stats.completedCount} completos
          </span>
        </div>
      </div>

      {/* Preview de capas (primeiros 6) */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Preview</p>
          <div className="flex gap-1.5 overflow-hidden">
            {entries.slice(0, 6).map((entry, index) => (
              <div 
                key={entry.id}
                className="relative flex-shrink-0 w-12 h-16 rounded overflow-hidden border border-border/50"
                style={{ 
                  transform: `translateX(-${index * 4}px)`,
                  zIndex: 10 - index 
                }}
              >
                <img
                  src={entry.image_url || '/placeholder.svg'}
                  alt={entry.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {entries.length > 6 && (
              <div 
                className="flex-shrink-0 w-12 h-16 rounded bg-secondary/50 border border-border/50 flex items-center justify-center"
                style={{ 
                  transform: `translateX(-${6 * 4}px)`,
                  zIndex: 4 
                }}
              >
                <span className="text-xs font-medium">+{entries.length - 6}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
