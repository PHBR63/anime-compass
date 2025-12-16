import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, Clock, CheckCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

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

export function RecentActivity() {
  const { data: entries, isLoading } = useAnimeEntries();

  const recentEntries = entries
    ? [...entries]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)
    : [];

  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <h3 className="font-display text-lg font-semibold mb-4">Atividade Recente</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="font-display text-lg font-semibold mb-4">Atividade Recente</h3>
      
      {recentEntries.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhuma atividade recente
        </p>
      ) : (
        <div className="space-y-4">
          {recentEntries.map((entry, index) => {
            const StatusIcon = statusIcons[entry.status];
            return (
              <div 
                key={entry.id}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors",
                  "animate-slide-up"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={entry.image_url || '/placeholder.svg'}
                  alt={entry.title}
                  className="w-12 h-16 object-cover rounded-md"
                />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {statusLabels[entry.status]}
                    </span>
                    {entry.rating && (
                      <>
                        <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        <span className="text-xs text-muted-foreground">{Number(entry.rating).toFixed(1)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(entry.updated_at), { 
                    addSuffix: true,
                    locale: ptBR 
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
