import { useState } from 'react';
import { Heart, MoreVertical, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

// Mapeamento de labels e cores para os status
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

interface SelectableAnimeCardProps {
  entry: AnimeEntry;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
}

/**
 * Card de anime com suporte a seleção para edição em massa
 */
export function SelectableAnimeCard({ 
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

  // Handler para clique no card
  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onSelectToggle(entry.id);
    } else {
      setModalOpen(true);
    }
  };

  // Handler para o checkbox
  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectToggle(entry.id);
  };

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

        {/* Imagem */}
        <div className="aspect-[3/4] relative overflow-hidden">
          <img
            src={entry.image_url || '/placeholder.svg'}
            alt={entry.title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              !isSelectionMode && "group-hover:scale-110"
            )}
          />
          
          {/* Gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Badge de status */}
          <Badge 
            variant="outline" 
            className={cn(
              "absolute top-2 right-2 text-xs border",
              statusColors[entry.status]
            )}
          >
            {statusLabels[entry.status]}
          </Badge>

          {/* Botões de ação (apenas fora do modo de seleção) */}
          {!isSelectionMode && (
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
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
                      onClick={() => updateEntry.mutate({ id: entry.id, status })}
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

      {/* Modal de detalhes (apenas fora do modo de seleção) */}
      {!isSelectionMode && (
        <AnimeDetailModal
          userEntry={entry}
          malId={entry.mal_id}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  );
}
