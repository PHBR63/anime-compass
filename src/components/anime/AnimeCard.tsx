import { useState } from 'react';
import { Heart, Star, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUpdateAnimeEntry, useDeleteAnimeEntry } from '@/hooks/useAnimeEntries';
import { AnimeDetailModal } from './AnimeDetailModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

interface AnimeCardProps {
  entry: AnimeEntry;
}

const statusLabels: Record<AnimeStatus, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Abandonado',
  not_started: 'Planejado',
};

const statusColors: Record<AnimeStatus, string> = {
  watching: 'bg-primary/20 text-primary border-primary/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  dropped: 'bg-destructive/20 text-destructive border-destructive/30',
  not_started: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

// Card de anime da lista do usuário com modal de detalhes
export function AnimeCard({ entry }: AnimeCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const updateEntry = useUpdateAnimeEntry();
  const deleteEntry = useDeleteAnimeEntry();
  
  const progress = entry.total_episodes 
    ? ((entry.episodes_watched || 0) / entry.total_episodes) * 100 
    : 0;

  const handleStatusChange = (status: AnimeStatus) => {
    updateEntry.mutate({ 
      id: entry.id, 
      status,
      ...(status === 'completed' && { completed_at: new Date().toISOString().split('T')[0] })
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateEntry.mutate({ id: entry.id, is_favorite: !entry.is_favorite });
  };

  return (
    <>
      <div 
        className="anime-card group cursor-pointer"
        onClick={() => setModalOpen(true)}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
          <img
            src={entry.image_url || '/placeholder.svg'}
            alt={entry.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Top actions */}
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="glass"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleFavorite}
            >
              <Heart className={cn(
                "h-4 w-4 transition-colors",
                entry.is_favorite && "fill-destructive text-destructive"
              )} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="glass" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('watching'); }}>
                  Assistindo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('completed'); }}>
                  Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('paused'); }}>
                  Pausado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('not_started'); }}>
                  Planejado
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); deleteEntry.mutate(entry.id); }}
                  className="text-destructive"
                >
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <span className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-full border",
              statusColors[entry.status]
            )}>
              {statusLabels[entry.status]}
            </span>
          </div>
          
          {/* Rating */}
          {entry.rating && (
            <div className="absolute bottom-16 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
              <Star className="h-3.5 w-3.5 text-warning fill-warning" />
              <span className="text-sm font-medium">{Number(entry.rating).toFixed(0)}</span>
            </div>
          )}
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-display font-semibold text-sm line-clamp-2 mb-2">
              {entry.title}
            </h3>
            
            {/* Progress bar */}
            {entry.total_episodes && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Episódio {entry.episodes_watched || 0}</span>
                  <span>/ {entry.total_episodes}</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      <AnimeDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userEntry={entry}
        malId={entry.mal_id}
      />
    </>
  );
}
