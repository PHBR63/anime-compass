import React, { useState, useCallback } from 'react';
import { Heart, Star, MoreVertical, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUpdateAnimeEntry, useDeleteAnimeEntry } from '@/hooks/useAnimeEntries';
import { AnimeDetailModal } from './AnimeDetailModal';
import { AnimeCardImage } from '@/components/ui/lazy-image';
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

/**
 * Card de anime da lista do usuário com modal de detalhes
 * Memoizado com lazy loading de imagens
 */
function AnimeCardComponent({ entry }: AnimeCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const updateEntry = useUpdateAnimeEntry();
  const deleteEntry = useDeleteAnimeEntry();
  
  // Calcula progresso
  const progress = entry.total_episodes 
    ? ((entry.episodes_watched || 0) / entry.total_episodes) * 100 
    : 0;

  // Handler para mudança de status
  const handleStatusChange = useCallback((status: AnimeStatus) => {
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
  }, [entry.id, entry.total_episodes, entry.episodes_watched, updateEntry]);

  // Handler para toggle favorito (memoizado)
  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateEntry.mutate({ id: entry.id, is_favorite: !entry.is_favorite });
  }, [entry.id, entry.is_favorite, updateEntry]);

  // Handler para deletar (memoizado)
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEntry.mutate(entry.id);
  }, [entry.id, deleteEntry]);

  // Handler para abrir modal (memoizado)
  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  // Componente do ícone de status
  const StatusIcon = statusIcons[entry.status];
  const colors = statusColors[entry.status];

  return (
    <>
      <div 
        className="anime-card group cursor-pointer touch-manipulation"
        onClick={handleOpenModal}
      >
        {/* Image com lazy loading */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
          <AnimeCardImage
            src={entry.image_url || '/placeholder.svg'}
            alt={entry.title}
            showHoverEffect={true}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
          
          {/* Top actions */}
          <div className="absolute top-2 md:top-3 right-2 md:right-3 flex items-center gap-1.5 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button
              variant="glass"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8 touch-manipulation"
              onClick={handleToggleFavorite}
            >
              <Heart className={cn(
                "h-3.5 w-3.5 md:h-4 md:w-4 transition-colors",
                entry.is_favorite && "fill-destructive text-destructive"
              )} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="glass" size="icon" className="h-7 w-7 md:h-8 md:w-8 touch-manipulation">
                  <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card min-w-[140px]">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('watching'); }} className="py-2.5">
                  Assistindo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('completed'); }} className="py-2.5">
                  Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('paused'); }} className="py-2.5">
                  Pausado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('not_started'); }} className="py-2.5">
                  Planejado
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive py-2.5"
                >
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status badge com ícone */}
          <div className="absolute top-2 md:top-3 left-2 md:left-3">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full border backdrop-blur-md shadow-lg",
              colors.bg, colors.text, colors.border
            )}>
              <StatusIcon className={cn(
                "h-3.5 w-3.5 md:h-4 md:w-4",
                entry.status === 'watching' && "animate-pulse"
              )} />
              {statusLabels[entry.status]}
            </span>
          </div>
          
          {/* Rating */}
          {entry.rating && (
            <div className="absolute bottom-14 md:bottom-16 right-2 md:right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
              <Star className="h-3 w-3 md:h-3.5 md:w-3.5 text-warning fill-warning" />
              <span className="text-xs md:text-sm font-medium">{Number(entry.rating).toFixed(0)}</span>
            </div>
          )}
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-4">
            <h3 className="font-display font-semibold text-xs md:text-sm line-clamp-2 mb-1 md:mb-2">
              {entry.title}
            </h3>
            
            {/* Progress bar */}
            {entry.total_episodes && (
              <div className="space-y-0.5 md:space-y-1">
                <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                  <span>Ep {entry.episodes_watched || 0}</span>
                  <span>/ {entry.total_episodes}</span>
                </div>
                <div className="h-0.5 md:h-1 bg-secondary rounded-full overflow-hidden">
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

// Exporta componente memoizado para evitar re-renders
export const AnimeCard = React.memo(AnimeCardComponent, (prevProps, nextProps) => {
  const prev = prevProps.entry;
  const next = nextProps.entry;
  
  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.episodes_watched === next.episodes_watched &&
    prev.is_favorite === next.is_favorite &&
    prev.rating === next.rating &&
    prev.image_url === next.image_url &&
    prev.title === next.title
  );
});
