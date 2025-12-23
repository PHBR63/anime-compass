import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, X, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vibrate } from '@/hooks/useHapticFeedback';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

/**
 * Extrai o ano de uma data string
 */
const extractYear = (dateStr: string | null): string | null => {
  if (!dateStr) return null;
  const year = new Date(dateStr).getFullYear();
  return isNaN(year) ? null : year.toString();
};

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

// Cores sólidas para melhor destaque e visibilidade
const statusColors: Record<AnimeStatus, { bg: string; text: string; border: string }> = {
  watching: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700' },
  completed: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-700' },
  paused: { bg: 'bg-yellow-500', text: 'text-yellow-950', border: 'border-yellow-600' },
  dropped: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
  not_started: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
};

interface SortableAnimeItemProps {
  id: string;
  anime: AnimeEntry;
  onRemove?: () => void;
  isOverlay?: boolean;
}

/**
 * Item de anime arrastável para reordenação em listas
 * Usa framer-motion para animações suaves
 */
export const SortableAnimeItem = forwardRef<HTMLDivElement, SortableAnimeItemProps>(
  function SortableAnimeItem({ id, anime, onRemove, isOverlay = false }, ref) {
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
      <motion.div
        ref={combinedRef}
        style={style}
        initial={false}
        animate={{
          scale: isDragging ? 0.98 : isOver ? 1.02 : 1,
          opacity: isDragging ? 0.4 : 1,
          y: isOver ? -2 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
          mass: 0.8,
        }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-card border transition-colors duration-200",
          isDragging && "border-primary/50 bg-primary/5",
          isOver && "border-primary bg-primary/10",
          !isDragging && !isOver && "border-border/50 hover:border-border",
          isOverlay && "shadow-2xl ring-2 ring-primary/50 bg-card border-primary"
        )}
      >
        {/* Alça de arrasto com animação e feedback háptico */}
        <motion.button
          {...attributes}
          {...listeners}
          onTouchStart={() => vibrate('selection')}
          whileHover={{ scale: 1.1, backgroundColor: 'hsl(var(--primary) / 0.15)' }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "p-1.5 rounded-lg transition-colors touch-none",
            "hover:text-primary",
            "cursor-grab active:cursor-grabbing",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          <motion.div
            animate={{ 
              rotate: isDragging ? [0, -5, 5, 0] : 0,
            }}
            transition={{ 
              duration: 0.3,
              repeat: isDragging ? Infinity : 0,
              repeatType: 'reverse',
            }}
          >
            <GripVertical className="h-5 w-5" />
          </motion.div>
        </motion.button>

        {/* Imagem com animação */}
        <motion.img
          src={anime.image_url || '/placeholder.svg'}
          alt={anime.title}
          className="w-12 h-16 object-cover rounded-lg"
          animate={{
            scale: isOverlay ? 1.05 : 1,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{anime.title}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {(() => {
              const StatusIcon = statusIcons[anime.status];
              const colors = statusColors[anime.status];
              return (
                <motion.span 
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-full border shadow-md",
                    colors.bg, colors.text, colors.border
                  )}
                  animate={{ scale: isOverlay ? 1.05 : 1 }}
                >
                  <StatusIcon className={cn(
                    "h-3 w-3",
                    anime.status === 'watching' && "animate-pulse"
                  )} />
                  {statusLabels[anime.status]}
                </motion.span>
              );
            })()}
            {anime.rating && (
              <span className="text-xs text-muted-foreground">
                ★ {anime.rating}
              </span>
            )}
            {extractYear(anime.started_at) && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                <Calendar className="h-3 w-3" />
                {extractYear(anime.started_at)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {anime.episodes_watched || 0}/{anime.total_episodes || '?'} eps
            </span>
          </div>
        </div>

        {/* Botão remover com animação */}
        {onRemove && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }
);
