import { useState } from 'react';
import { 
  X, 
  Check, 
  Star, 
  Heart, 
  Archive, 
  Trash2, 
  List,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarRating } from './StarRating';
import { 
  useBulkUpdateStatus, 
  useBulkUpdateRating, 
  useBulkToggleFavorite, 
  useBulkArchive, 
  useBulkDelete,
  useBulkAddToList
} from '@/hooks/useBulkAnimeOperations';
import { useCustomLists } from '@/hooks/useCustomLists';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

// Labels para os status
const statusLabels: Record<AnimeStatus, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Dropado',
  not_started: 'Planejado',
};

interface BulkActionsBarProps {
  selectedIds: string[];
  totalItems: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

/**
 * Barra de ações em massa para edição de múltiplos animes
 */
export function BulkActionsBar({
  selectedIds,
  totalItems,
  onClearSelection,
  onSelectAll,
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  // Hooks de operações em massa
  const bulkUpdateStatus = useBulkUpdateStatus();
  const bulkUpdateRating = useBulkUpdateRating();
  const bulkToggleFavorite = useBulkToggleFavorite();
  const bulkArchive = useBulkArchive();
  const bulkDelete = useBulkDelete();
  const bulkAddToList = useBulkAddToList();

  // Buscar listas do usuário
  const { data: lists } = useCustomLists();

  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === totalItems;

  // Handlers para ações
  const handleStatusChange = (status: AnimeStatus) => {
    bulkUpdateStatus.mutate({ ids: selectedIds, status }, {
      onSuccess: () => onClearSelection(),
    });
  };

  const handleRatingConfirm = () => {
    if (selectedRating > 0) {
      bulkUpdateRating.mutate({ ids: selectedIds, rating: selectedRating }, {
        onSuccess: () => {
          onClearSelection();
          setShowRatingDialog(false);
          setSelectedRating(0);
        },
      });
    }
  };

  const handleFavorite = (isFavorite: boolean) => {
    bulkToggleFavorite.mutate({ ids: selectedIds, isFavorite }, {
      onSuccess: () => onClearSelection(),
    });
  };

  const handleArchive = () => {
    bulkArchive.mutate({ ids: selectedIds, isArchived: true }, {
      onSuccess: () => onClearSelection(),
    });
  };

  const handleDelete = () => {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        onClearSelection();
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleAddToList = (listId: string) => {
    bulkAddToList.mutate({ animeIds: selectedIds, listId }, {
      onSuccess: () => onClearSelection(),
    });
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="glass-card px-4 py-3 flex items-center gap-3 shadow-lg border border-border/50">
          {/* Contador e seleção */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={allSelected ? onClearSelection : onSelectAll}
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
            <Badge variant="secondary" className="font-medium">
              {selectedCount} selecionado{selectedCount !== 1 && 's'}
            </Badge>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Ações */}
          <div className="flex items-center gap-1">
            {/* Mudar Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Status</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover">
                {(['watching', 'completed', 'paused', 'dropped', 'not_started'] as AnimeStatus[]).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status)}
                  >
                    {statusLabels[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dar Nota */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowRatingDialog(true)}
            >
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Nota</span>
            </Button>

            {/* Favoritar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Favorito</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover">
                <DropdownMenuItem onClick={() => handleFavorite(true)}>
                  <Heart className="h-4 w-4 mr-2 fill-red-500 text-red-500" />
                  Favoritar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFavorite(false)}>
                  <Heart className="h-4 w-4 mr-2" />
                  Desfavoritar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Adicionar à Lista */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Lista</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover">
                {lists && lists.length > 0 ? (
                  lists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                    >
                      {list.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    Nenhuma lista criada
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Arquivar */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={handleArchive}
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Arquivar</span>
            </Button>

            {/* Deletar */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Cancelar seleção */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir animes</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} anime(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para dar nota */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dar nota aos animes selecionados</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <StarRating
              rating={selectedRating}
              onRatingChange={setSelectedRating}
              size="lg"
            />
            <p className="text-sm text-muted-foreground">
              Aplicar nota {selectedRating} a {selectedCount} anime(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRatingConfirm} disabled={selectedRating === 0}>
                Aplicar Nota
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
