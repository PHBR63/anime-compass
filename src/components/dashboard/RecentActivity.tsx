import { UserAnimeEntry } from '@/types/anime';
import { statusLabels } from '@/data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, Clock, CheckCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentActivityProps {
  entries: UserAnimeEntry[];
}

const statusIcons = {
  watching: PlayCircle,
  completed: CheckCircle,
  paused: PauseCircle,
  dropped: Clock,
  planned: Clock,
};

export function RecentActivity({ entries }: RecentActivityProps) {
  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="font-display text-lg font-semibold mb-4">Atividade Recente</h3>
      
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
                src={entry.anime.imageUrl}
                alt={entry.anime.title}
                className="w-12 h-16 object-cover rounded-md"
              />
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{entry.anime.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {statusLabels[entry.status]}
                  </span>
                  {entry.rating && (
                    <>
                      <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                      <span className="text-xs text-muted-foreground">{entry.rating}</span>
                    </>
                  )}
                </div>
              </div>
              
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(entry.updatedAt), { 
                  addSuffix: true,
                  locale: ptBR 
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
