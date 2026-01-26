import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { formatRelativeTime } from '@/lib/dateUtils';
import { Star, Clock, CheckCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedList } from '@/components/animations';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

/**
 * Componente RecentActivity - Exibe atividade recente do usuário
 * Lista animada com os últimos animes atualizados
 */

const statusIcons: Record<AnimeStatus, typeof PlayCircle> = {
  watching: PlayCircle,
  completed: CheckCircle,
  paused: PauseCircle,
  dropped: Clock,
  not_started: Clock,
};

const statusLabels: Record<AnimeStatus, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Abandonado',
  not_started: 'Planejado',
};

// Cores específicas para cada status - mais vibrantes e visíveis
const statusColors: Record<AnimeStatus, { bg: string; icon: string; text: string }> = {
  watching: { bg: 'bg-primary/30', icon: 'text-primary', text: 'text-primary' },
  completed: { bg: 'bg-green-500/30', icon: 'text-green-400', text: 'text-green-400' },
  paused: { bg: 'bg-yellow-500/30', icon: 'text-yellow-400', text: 'text-yellow-400' },
  dropped: { bg: 'bg-red-500/30', icon: 'text-red-400', text: 'text-red-400' },
  not_started: { bg: 'bg-purple-500/30', icon: 'text-purple-400', text: 'text-purple-400' },
};

export function RecentActivity() {
  const { data: entries, isLoading } = useAnimeEntries();

  const recentEntries = entries
    ? [...entries]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)
    : [];

  if (isLoading) {
    return (
      <div className="glass-card p-4 md:p-6 animate-fade-in">
        <h3 className="font-display text-base md:text-lg font-semibold mb-4">Atividade Recente</h3>
        <div className="space-y-3 md:space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 md:h-16 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 md:p-6 animate-fade-in">
      <h3 className="font-display text-base md:text-lg font-semibold mb-4">Atividade Recente</h3>
      
      {recentEntries.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm py-6 md:py-8">
          Nenhuma atividade recente
        </p>
      ) : (
        <AnimatedList 
          className="space-y-3 md:space-y-4"
          staggerDelay={0.1}
          duration={0.4}
          direction="left"
          distance={30}
        >
          {recentEntries.map((entry) => {
            const StatusIcon = statusIcons[entry.status];
            return (
              <div 
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                )}
              >
                <img
                  src={entry.image_url || '/placeholder.svg'}
                  alt={entry.title}
                  className="w-10 h-14 md:w-12 md:h-16 object-cover rounded-md shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm md:text-base truncate">{entry.title}</p>
                  <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
                    <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", statusColors[entry.status].bg)}>
                      <StatusIcon className={cn(
                        "h-3.5 w-3.5 md:h-4 md:w-4",
                        statusColors[entry.status].icon,
                        entry.status === 'watching' && "animate-pulse"
                      )} />
                      <span className={cn("text-[10px] md:text-xs font-semibold", statusColors[entry.status].text)}>
                        {statusLabels[entry.status]}
                      </span>
                    </div>
                    {entry.rating && (
                      <div className="flex items-center gap-0.5 bg-warning/20 px-1.5 py-0.5 rounded-full">
                        <Star className="h-3 w-3 md:h-3.5 md:w-3.5 text-warning fill-warning" />
                        <span className="text-[10px] md:text-xs text-warning font-medium">{Number(entry.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                  {formatRelativeTime(entry.updated_at)}
                </span>
              </div>
            );
          })}
        </AnimatedList>
      )}
    </div>
  );
}
