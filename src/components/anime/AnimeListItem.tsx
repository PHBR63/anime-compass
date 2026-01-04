import React, { useState, useCallback } from 'react';
import { Heart, MoreVertical, Star, Calendar, Tv, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle, AlertTriangle, Eye } from 'lucide-react';
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
import { SyncPendingBadge } from './SyncPendingBadge';
import { LazyImage } from '@/components/ui/lazy-image';
import { useUpdateAnimeEntry, useDeleteAnimeEntry } from '@/hooks/useAnimeEntries';
import { useAnimeEntriesContext } from '@/contexts/AnimeEntriesContext';
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

// Cores orientais para melhor visibilidade
const statusColors: Record<AnimeStatus, { bg: string; text: string; border: string }> = {
  watching: { bg: 'bg-sakura/40', text: 'text-sakura', border: 'border-sakura/50' },
  completed: { bg: 'bg-green-500/40', text: 'text-green-400', border: 'border-green-500/50' },
  paused: { bg: 'bg-amber-500/40', text: 'text-amber-400', border: 'border-amber-500/50' },
  dropped: { bg: 'bg-torii/40', text: 'text-torii', border: 'border-torii/50' },
  not_started: { bg: 'bg-purple-500/40', text: 'text-purple-400', border: 'border-purple-500/50' },
};

interface AnimeListItemProps {
  entry: AnimeEntry;
  onClick?: () => void;
}

/**
 * Item de anime em formato de lista (horizontal)
 * Memoizado para evitar re-renders desnecessários
 */
function AnimeListItemComponent({ entry, onClick }: AnimeListItemProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const updateEntry = useUpdateAnimeEntry();
  const deleteEntry = useDeleteAnimeEntry();
  
  // Usa contexto centralizado para sync pendente (evita re-renders em massa)
  const { hasPendingForAnime, getPendingOperationType } = useAnimeEntriesContext();
  
  // Verifica se há operação pendente para este anime
  const isPending = hasPendingForAnime(entry.id) || hasPendingForAnime(entry.mal_id);
  const pendingType = getPendingOperationType(entry.id) || getPendingOperationType(entry.mal_id);

  const progress = entry.total_episodes 
    ? (entry.episodes_watched || 0) / entry.total_episodes * 100 
    : 0;

  // Handler memoizado para clique no card
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      setModalOpen(true);
    }
  }, [onClick]);

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

  // Handler memoizado para revelar spoiler
  const handleRevealSpoiler = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSpoiler(true);
  }, []);

  return (
    <>
      <div 
        className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 hover:border-sakura/30 hover:shadow-md hover:shadow-sakura/5 transition-all cursor-pointer"
        onClick={handleClick}
      >
        {/* Imagem com lazy loading e tratamento de erro */}
        <LazyImage
          src={entry.image_url || '/placeholder.svg'}
          alt={entry.title}
          className="w-full h-full object-cover"
          containerClassName="w-16 h-24 rounded-lg shrink-0"
          enableCache={true}
        />

        {/* Info principal */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{entry.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Tv className="h-3 w-3" />
                  {entry.total_episodes ? `${entry.total_episodes} eps` : '? eps'}
                </span>
                {entry.started_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(entry.started_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
            
            {/* Badge de status com ícone e indicador de sync */}
            <div className="flex items-center gap-1.5">
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
              
              {/* Indicador de sync pendente */}
              {isPending && (
                <SyncPendingBadge operationType={pendingType} size="sm" />
              )}
            </div>
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
                            ? "text-kintsugi fill-kintsugi" 
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
              </div>
            )}
            {entry.notes && (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {entry.notes_has_spoilers && !showSpoiler ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-kintsugi shrink-0" />
                    <span className="text-xs text-muted-foreground blur-sm select-none line-clamp-1">
                      {entry.notes}
                    </span>
                    <button
                      onClick={handleRevealSpoiler}
                      className="text-xs text-sakura hover:underline shrink-0 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Revelar
                    </button>
                  </>
                ) : (
                  <>
                    {entry.notes_has_spoilers && (
                      <AlertTriangle className="h-3 w-3 text-kintsugi shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {entry.notes}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleToggleFavorite}
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
      </div>

      {/* Modal lazy loaded */}
      <LazyAnimeDetailModal
        userEntry={entry}
        malId={entry.mal_id}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}

// Exporta componente memoizado para evitar re-renders desnecessários
export const AnimeListItem = React.memo(AnimeListItemComponent, (prevProps, nextProps) => {
  const prev = prevProps.entry;
  const next = nextProps.entry;
  
  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.episodes_watched === next.episodes_watched &&
    prev.is_favorite === next.is_favorite &&
    prev.rating === next.rating &&
    prev.notes === next.notes &&
    prev.image_url === next.image_url &&
    prev.title === next.title
  );
});
