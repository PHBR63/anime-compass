import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

// Labels para os status
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

interface SortableAnimeItemProps {
  id: string;
  anime: AnimeEntry;
  onRemove?: () => void;
}

/**
 * Item de anime arrastável para reordenação em listas
 * Usa forwardRef para compatibilidade com dnd-kit
 */
export const SortableAnimeItem = forwardRef<HTMLDivElement, SortableAnimeItemProps>(
  function SortableAnimeItem({ id, anime, onRemove }, ref) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    // Combinar refs
    const combinedRef = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <div
        ref={combinedRef}
        style={style}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 transition-all",
          isDragging && "opacity-50 shadow-lg shadow-primary/20 border-primary/50 z-50"
        )}
      >
        {/* Alça de arrasto */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-secondary cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Imagem */}
        <img
          src={anime.image_url || '/placeholder.svg'}
          alt={anime.title}
          className="w-12 h-16 object-cover rounded-lg"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{anime.title}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {(() => {
              const StatusIcon = statusIcons[anime.status];
              const colors = statusColors[anime.status];
              return (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-full border",
                  colors.bg, colors.text, colors.border
                )}>
                  <StatusIcon className={cn(
                    "h-3 w-3",
                    anime.status === 'watching' && "animate-pulse"
                  )} />
                  {statusLabels[anime.status]}
                </span>
              );
            })()}
            {anime.rating && (
              <span className="text-xs text-muted-foreground">
                ★ {anime.rating}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {anime.episodes_watched || 0}/{anime.total_episodes || '?'} eps
            </span>
          </div>
        </div>

        {/* Botão remover */}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);
