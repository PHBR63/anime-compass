import React, { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Heart, Star, MoreVertical, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUpdateAnimeEntry } from '@/hooks/useAnimeEntries';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';
import { AnimeCardImage } from '@/components/ui/lazy-image';
import { vibrate } from '@/hooks/useHapticFeedback';
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

interface SortableAnimeCardProps {
  id: string;
  entry: AnimeEntry;
  isOverlay?: boolean;
  onRemove?: () => void;
}

// Labels dos status
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

// Cores orientais para melhor visibilidade
const statusColors: Record<AnimeStatus, { bg: string; text: string; border: string }> = {
  watching: { bg: 'bg-sakura/40', text: 'text-sakura', border: 'border-sakura/50' },
  completed: { bg: 'bg-green-500/40', text: 'text-green-400', border: 'border-green-500/50' },
  paused: { bg: 'bg-amber-500/40', text: 'text-amber-400', border: 'border-amber-500/50' },
  dropped: { bg: 'bg-torii/40', text: 'text-torii', border: 'border-torii/50' },
  not_started: { bg: 'bg-purple-500/40', text: 'text-purple-400', border: 'border-purple-500/50' },
};

/**
 * Card de anime arrastável para reordenação no modo grid
 * Usa framer-motion para animações suaves de drag and drop
 */
function SortableAnimeCardComponent({ id, entry, isOverlay = false, onRemove }: SortableAnimeCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const updateEntry = useUpdateAnimeEntry();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  // Estilo de transformação do dnd-kit
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

  // Handler para toggle favorito
  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateEntry.mutate({ id: entry.id, is_favorite: !entry.is_favorite });
  }, [entry.id, entry.is_favorite, updateEntry]);

  // Handler para abrir modal
  const handleOpenModal = useCallback(() => {
    if (!isDragging) {
      setModalOpen(true);
    }
  }, [isDragging]);

  // Componente do ícone de status
  const StatusIcon = statusIcons[entry.status];
  const colors = statusColors[entry.status];

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        initial={false}
        animate={{
          scale: isDragging ? 1.05 : isOver ? 0.98 : 1,
          opacity: isDragging ? 0.5 : 1,
          zIndex: isDragging ? 50 : 1,
          boxShadow: isDragging 
            ? '0 20px 40px -10px rgba(0,0,0,0.4)' 
            : isOver 
              ? '0 0 20px 2px hsl(var(--primary) / 0.3)' 
              : 'none',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
          scale: { duration: 0.15 },
          opacity: { duration: 0.15 },
        }}
        className={cn(
          "relative anime-card group cursor-pointer touch-manipulation rounded-xl overflow-hidden",
          isDragging && "ring-2 ring-primary/50",
          isOverlay && "shadow-2xl"
        )}
      >
        {/* Handle de arraste no topo */}
        <motion.button
          {...listeners}
          onTouchStart={() => vibrate('selection')}
          className={cn(
            "absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-1",
            "bg-gradient-to-b from-background/90 via-background/70 to-transparent",
            "py-2 px-3 cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isDragging && "opacity-100"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">Arrastar</span>
        </motion.button>

        <div onClick={handleOpenModal}>
          {/* Image com lazy loading */}
          <div className="relative aspect-[3/4] overflow-hidden">
            <AnimeCardImage
              src={entry.image_url || '/placeholder.svg'}
              alt={entry.title}
              showHoverEffect={!isDragging}
            />
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
            
            {/* Top actions */}
            <div className="absolute top-8 md:top-10 right-2 md:right-3 flex items-center gap-1.5 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                  {onRemove && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="text-destructive py-2.5"
                      >
                        Remover da lista
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status badge com ícone */}
            <div className="absolute top-8 md:top-10 left-2 md:left-3 flex items-center gap-1.5">
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
                <Star className="h-3 w-3 md:h-3.5 md:w-3.5 text-kintsugi fill-kintsugi" />
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
                      className="h-full bg-gradient-to-r from-sakura to-torii rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicador visual de drop zone */}
        <motion.div
          initial={false}
          animate={{
            opacity: isOver ? 1 : 0,
            scale: isOver ? 1 : 0.95,
          }}
          className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-xl pointer-events-none"
        />
      </motion.div>

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

// Exporta componente memoizado
export const SortableAnimeCard = React.memo(SortableAnimeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.entry.id === nextProps.entry.id &&
    prevProps.entry.status === nextProps.entry.status &&
    prevProps.entry.episodes_watched === nextProps.entry.episodes_watched &&
    prevProps.entry.is_favorite === nextProps.entry.is_favorite &&
    prevProps.entry.rating === nextProps.entry.rating &&
    prevProps.isOverlay === nextProps.isOverlay
  );
});
