import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

// Labels para os status
const statusLabels: Record<AnimeStatus, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Dropado',
  not_started: 'Planejado',
};

const statusColors: Record<AnimeStatus, string> = {
  watching: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  dropped: 'bg-red-500/20 text-red-400 border-red-500/30',
  not_started: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface SortableAnimeItemProps {
  id: string;
  anime: AnimeEntry;
  onRemove?: () => void;
}

/**
 * Item de anime arrastável para reordenação em listas
 */
export function SortableAnimeItem({ id, anime, onRemove }: SortableAnimeItemProps) {
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

  return (
    <div
      ref={setNodeRef}
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
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant="outline" 
            className={cn("text-xs", statusColors[anime.status])}
          >
            {statusLabels[anime.status]}
          </Badge>
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
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
