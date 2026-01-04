import React, { useState, useCallback } from 'react';
import { Heart, MoreVertical, Check, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle } from 'lucide-react';
import { AnimeCardImage } from '@/components/ui/lazy-image';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LazyAnimeDetailModal } from './LazyAnimeDetailModal';
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

// Cores sólidas para melhor destaque
const statusColors: Record<AnimeStatus, { bg: string; text: string; border: string }> = {
  watching: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  completed: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-400' },
  paused: { bg: 'bg-yellow-500', text: 'text-yellow-950', border: 'border-yellow-400' },
  dropped: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400' },
  not_started: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400' },
};

interface SelectableAnimeCardProps {
  entry: AnimeEntry;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
}

/**
 * Card de anime com suporte a seleção para edição em massa
 * Memoizado para evitar re-renders desnecessários
 */
function SelectableAnimeCardComponent({ 
  entry, 
  isSelectionMode, 
  isSelected, 
  onSelectToggle 
}: SelectableAnimeCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const updateEntry = useUpdateAnimeEntry();
  const deleteEntry = useDeleteAnimeEntry();

  const progress = entry.total_episodes 
    ? (entry.episodes_watched || 0) / entry.total_episodes * 100 
    : 0;

  // Handler memoizado para clique no card
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onSelectToggle(entry.id);
    } else {
      setModalOpen(true);
    }
  }, [isSelectionMode, onSelectToggle, entry.id]);

  // Handler memoizado para o checkbox
  const handleCheckboxChange = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectToggle(entry.id);
  }, [onSelectToggle, entry.id]);

  // Handler memoizado para toggle favorito
  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateEntry.mutate({
      id: entry.id,
      is_favorite: !entry.is_favorite,
    });
  }, [updateEntry, entry.id, entry.is_favorite]);

  // Handler memoizado para mudança de status
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
  }, [updateEntry, entry.id, entry.total_episodes, entry.episodes_watched]);

  // Handler memoizado para deletar
  const handleDelete = useCallback(() => {
    deleteEntry.mutate(entry.id);
  }, [deleteEntry, entry.id]);

  return (
    <>
      <div 
        className={cn(
          "group relative rounded-xl overflow-hidden bg-card border transition-all duration-300 cursor-pointer",
          isSelected 
            ? "border-primary ring-2 ring-primary/50 scale-[0.98]" 
            : "border-border/50 hover:border-border hover:shadow-lg hover:shadow-primary/5"
        )}
        onClick={handleCardClick}
      >
        {/* Checkbox de seleção */}
        {isSelectionMode && (
          <div 
            className="absolute top-2 left-2 z-20"
            onClick={handleCheckboxChange}
          >
            <div className={cn(
              "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
              isSelected 
                ? "bg-primary border-primary" 
                : "bg-background/80 backdrop-blur-sm border-border hover:border-primary"
            )}>
              {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
            </div>
          </div>
        )}

        {/* Overlay de seleção */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/10 z-10 pointer-events-none" />
        )}

        {/* Imagem com lazy loading e tratamento de erro */}
        <div className="aspect-[3/4] relative overflow-hidden">
          <AnimeCardImage
            src={entry.image_url || '/placeholder.svg'}
            alt={entry.title}
            showHoverEffect={!isSelectionMode}
            enableCache={true}
          />
          
          {/* Gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Badge de status com ícone */}
          {(() => {
            const StatusIcon = statusIcons[entry.status];
            const colors = statusColors[entry.status];
            return (
              <span className={cn(
                "absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border shadow-md",
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

          {/* Botões de ação (apenas fora do modo de seleção) */}
          {!isSelectionMode && (
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={handleToggleFavorite}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    entry.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  )} 
                />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover">
                  {(['watching', 'completed', 'paused', 'dropped', 'not_started'] as AnimeStatus[]).map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                    >
                      {statusLabels[status]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleDelete}
                  >
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Info sobreposta */}
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
            <h3 className="font-semibold text-sm line-clamp-2 text-foreground drop-shadow-lg">
              {entry.title}
            </h3>
            
            {/* Progresso */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{entry.episodes_watched || 0} / {entry.total_episodes || '?'}</span>
                {entry.rating && <span>★ {entry.rating}</span>}
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalhes - lazy loaded (apenas fora do modo de seleção) */}
      {!isSelectionMode && (
        <LazyAnimeDetailModal
          userEntry={entry}
          malId={entry.mal_id}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  );
}

// Exporta componente memoizado para evitar re-renders desnecessários
export const SelectableAnimeCard = React.memo(SelectableAnimeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.entry.id === nextProps.entry.id &&
    prevProps.entry.status === nextProps.entry.status &&
    prevProps.entry.episodes_watched === nextProps.entry.episodes_watched &&
    prevProps.entry.is_favorite === nextProps.entry.is_favorite &&
    prevProps.entry.rating === nextProps.entry.rating &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.isSelected === nextProps.isSelected
  );
});
