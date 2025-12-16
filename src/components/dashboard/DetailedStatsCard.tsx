import { Clock, Film, Trophy, Palette, Building2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDetailedStats, DetailedStats } from '@/hooks/useDetailedStats';
import { cn } from '@/lib/utils';

// Componente para exibir barra de progresso com label
function StatBar({ 
  label, 
  count, 
  percentage, 
  color 
}: { 
  label: string; 
  count: number; 
  percentage: number; 
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium truncate max-w-[70%]">{label}</span>
        <span className="text-muted-foreground text-xs">{count} ({percentage}%)</span>
      </div>
      <Progress value={percentage} className={cn("h-2", color)} />
    </div>
  );
}

// Componente de loading skeleton
function DetailedStatsSkeleton() {
  return (
    <div className="glass-card p-6 space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

// Componente principal de estatísticas detalhadas
export function DetailedStatsCard() {
  const { data: stats, isLoading, error } = useDetailedStats();

  if (isLoading) {
    return <DetailedStatsSkeleton />;
  }

  if (error || !stats) {
    return null;
  }

  // Cores para os gêneros
  const genreColors = [
    '[&>div]:bg-primary',
    '[&>div]:bg-accent',
    '[&>div]:bg-secondary',
    '[&>div]:bg-muted',
    '[&>div]:bg-primary/60',
  ];

  // Cores para os estúdios
  const studioColors = [
    '[&>div]:bg-accent',
    '[&>div]:bg-primary',
    '[&>div]:bg-secondary',
    '[&>div]:bg-muted',
    '[&>div]:bg-accent/60',
  ];

  return (
    <div className="glass-card p-6 space-y-6 animate-fade-in">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        Estatísticas Detalhadas
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tempo Total Assistido */}
        <div className="space-y-4 p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Tempo Total Assistido
          </div>
          
          <div className="space-y-1">
            <div className="text-3xl font-bold text-primary">
              {stats.time.formattedShort}
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.time.formattedLong}
            </p>
          </div>

          <div className="pt-2 border-t border-border/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de horas</span>
              <span className="font-medium">{stats.time.totalHours.toLocaleString()}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Média por anime</span>
              <span className="font-medium">{stats.averageEpisodesPerAnime} eps</span>
            </div>
          </div>
        </div>

        {/* Gêneros Favoritos */}
        <div className="space-y-4 p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Palette className="h-4 w-4" />
            Gêneros Favoritos
          </div>

          {stats.genres.length > 0 ? (
            <div className="space-y-3">
              {stats.genres.map((genre, index) => (
                <StatBar
                  key={genre.name}
                  label={genre.name}
                  count={genre.count}
                  percentage={genre.percentage}
                  color={genreColors[index] || genreColors[0]}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Adicione mais animes para ver estatísticas de gêneros
            </p>
          )}
        </div>

        {/* Estúdios Favoritos */}
        <div className="space-y-4 p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Estúdios Favoritos
          </div>

          {stats.studios.length > 0 ? (
            <div className="space-y-3">
              {stats.studios.map((studio, index) => (
                <StatBar
                  key={studio.name}
                  label={studio.name}
                  count={studio.count}
                  percentage={studio.percentage}
                  color={studioColors[index] || studioColors[0]}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Adicione mais animes para ver estatísticas de estúdios
            </p>
          )}
        </div>
      </div>

      {/* Resumo adicional */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <Film className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{stats.totalAnimes} animes</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Completados:</span>
          <span className="font-medium">{stats.completedAnimes} animes</span>
        </div>
      </div>
    </div>
  );
}
