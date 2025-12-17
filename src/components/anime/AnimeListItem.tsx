import { useState } from 'react';
import { Heart, MoreVertical, Star, Calendar, Tv, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AnimeDetailModal } from './AnimeDetailModal';
import { useUpdateAnimeEntry, useDeleteAnimeEntry } from '@/hooks/useAnimeEntries';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

// Mapeamento de labels para os status
const statusLabels: Record<AnimeStatus, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Abandonado',
  not_started: 'Planejado',
};

// Ícones para cada status
const statusIcons: Record<AnimeStatus, typeof PlayCircle> = {
  watching: PlayCircle,
  completed: CheckCircle,
  paused: PauseCircle,
  dropped: XCircle,
  not_started: Clock,
};

// Cores vibrantes para melhor visibilidade
const statusColors: Record<AnimeStatus, { bg: string; text: string; border: string }> = {
  watching: { bg: 'bg-primary/40', text: 'text-primary', border: 'border-primary/50' },
  completed: { bg: 'bg-green-500/40', text: 'text-green-400', border: 'border-green-500/50' },
  paused: { bg: 'bg-yellow-500/40', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  dropped: { bg: 'bg-red-500/40', text: 'text-red-400', border: 'border-red-500/50' },
  not_started: { bg: 'bg-purple-500/40', text: 'text-purple-400', border: 'border-purple-500/50' },
};

interface AnimeListItemProps {
  entry: AnimeEntry;
  onClick?: () => void;
}

/**
 * Item de anime em formato de lista (horizontal)
 */
export function AnimeListItem({ entry, onClick }: AnimeListItemProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const updateEntry = useUpdateAnimeEntry();
  const deleteEntry = useDeleteAnimeEntry();

  const progress = entry.total_episodes 
    ? (entry.episodes_watched || 0) / entry.total_episodes * 100 
    : 0;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <div 
        className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-md transition-all cursor-pointer"
        onClick={handleClick}
      >
        {/* Imagem */}
        <img
          src={entry.image_url || '/placeholder.svg'}
          alt={entry.title}
          className="w-16 h-24 object-cover rounded-lg shrink-0"
        />

        {/* Info principal */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{entry.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {entry.total_episodes && (
                  <span className="flex items-center gap-1">
                    <Tv className="h-3 w-3" />
                    {entry.total_episodes} eps
                  </span>
                )}
                {entry.started_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(entry.started_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
            
            {/* Badge de status com ícone */}
            {(() => {
              const StatusIcon = statusIcons[entry.status];
              const colors = statusColors[entry.status];
              return (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border shrink-0",
                  colors.bg, colors.text, colors.border
                )}>
                  <StatusIcon className={cn(
                    "h-3.5 w-3.5",
                    entry.status === 'watching' && "animate-pulse"
                  )} />
                  {statusLabels[entry.status]}
                </span>
              );
            })()}
          </div>

          {/* Progresso */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {entry.episodes_watched || 0} / {entry.total_episodes || '?'} episódios
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Rating e nota */}
          <div className="flex items-center gap-3">
            {entry.rating && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-3.5 w-3.5",
                      star <= entry.rating! 
                        ? "text-warning fill-warning" 
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
            {entry.notes && (
              <span className="text-xs text-muted-foreground line-clamp-1 flex-1">
                {entry.notes}
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              updateEntry.mutate({
                id: entry.id,
                is_favorite: !entry.is_favorite,
              });
            }}
          >
            <Heart 
              className={cn(
                "h-4 w-4",
                entry.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )} 
            />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {(['watching', 'completed', 'paused', 'dropped', 'not_started'] as AnimeStatus[]).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => {
                    // Se marcando como completo, atualiza episódios para o total
                    if (status === 'completed') {
                      updateEntry.mutate({ 
                        id: entry.id, 
                        status,
                        episodes_watched: entry.total_episodes || entry.episodes_watched || 0,
                        completed_at: new Date().toISOString().split('T')[0]
                      });
                    } else {
                      updateEntry.mutate({ id: entry.id, status });
                    }
                  }}
                >
                  {statusLabels[status]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteEntry.mutate(entry.id)}
              >
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimeDetailModal
        userEntry={entry}
        malId={entry.mal_id}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
