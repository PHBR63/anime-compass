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
  Square,
  PlayCircle,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
  HeartOff,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
  DialogDescription,
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
import { cn } from '@/lib/utils';

type AnimeStatus = Database['public']['Enums']['anime_status'];

// Labels e ícones para os status
const statusConfig: Record<AnimeStatus, { label: string; icon: typeof PlayCircle; color: string }> = {
  watching: { label: 'Assistindo', icon: PlayCircle, color: 'text-blue-500' },
  completed: { label: 'Completo', icon: CheckCircle, color: 'text-green-500' },
  paused: { label: 'Pausado', icon: PauseCircle, color: 'text-amber-500' },
  dropped: { label: 'Dropado', icon: XCircle, color: 'text-red-500' },
  not_started: { label: 'Planejado', icon: Clock, color: 'text-purple-500' },
};

interface BulkActionsBarProps {
  selectedIds: string[];
  totalItems: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

/**
 * Barra de ações em massa redesenhada com tooltips, grupos e melhor UX
 */
export function BulkActionsBar({
  selectedIds,
  totalItems,
  onClearSelection,
  onSelectAll,
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState<AnimeStatus | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  // Hooks de operações em massa
  const bulkUpdateStatus = useBulkUpdateStatus();
  const bulkUpdateRating = useBulkUpdateRating();
  const bulkToggleFavorite = useBulkToggleFavorite();
  const bulkArchive = useBulkArchive();
  const bulkDelete = useBulkDelete();
  const bulkAddToList = useBulkAddToList();

  // Verifica se alguma operação está em andamento
  const isLoading = bulkUpdateStatus.isPending || bulkUpdateRating.isPending || 
    bulkToggleFavorite.isPending || bulkArchive.isPending || 
    bulkDelete.isPending || bulkAddToList.isPending;

  // Buscar listas do usuário
  const { data: lists } = useCustomLists();

  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === totalItems && totalItems > 0;

  // Handlers para ações
  const handleStatusChange = (status: AnimeStatus) => {
    // Para status "dropped", pedir confirmação
    if (status === 'dropped') {
      setShowStatusConfirm(status);
    } else {
      executeStatusChange(status);
    }
  };

  const executeStatusChange = (status: AnimeStatus) => {
    bulkUpdateStatus.mutate({ ids: selectedIds, status }, {
      onSuccess: () => {
        onClearSelection();
        setShowStatusConfirm(null);
      },
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
      onSuccess: () => {
        onClearSelection();
        setShowArchiveConfirm(false);
      },
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
    <TooltipProvider delayDuration={300}>
      {/* Barra principal */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in max-w-[95vw]">
        <div className="glass-card px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 shadow-xl border border-primary/20 bg-background/95 backdrop-blur-xl">
          
          {/* Grupo 1: Seleção */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={allSelected ? onClearSelection : onSelectAll}
                  disabled={isLoading}
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </TooltipContent>
            </Tooltip>
            
            <Badge variant="secondary" className="font-semibold text-primary whitespace-nowrap">
              {selectedCount} selecionado{selectedCount !== 1 && 's'}
            </Badge>
          </div>

          <div className="h-6 w-px bg-border shrink-0" />

          {/* Grupo 2: Status */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5" disabled={isLoading}>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="hidden md:inline">Status</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Alterar status de {selectedCount} anime(s)</TooltipContent>
              </Tooltip>
              <DropdownMenuContent className="bg-popover w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Alterar status para:
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(statusConfig) as [AnimeStatus, typeof statusConfig[AnimeStatus]][]).map(([status, config]) => {
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="gap-2"
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span>{config.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {selectedCount}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dar Nota */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={() => setShowRatingDialog(true)}
                  disabled={isLoading}
                >
                  <Star className="h-4 w-4 text-kintsugi" />
                  <span className="hidden md:inline">Nota</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dar nota a {selectedCount} anime(s)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-6 w-px bg-border shrink-0 hidden sm:block" />

          {/* Grupo 3: Organização */}
          <div className="flex items-center gap-1">
            {/* Favoritar */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5" disabled={isLoading}>
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="hidden lg:inline">Favorito</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Gerenciar favoritos</TooltipContent>
              </Tooltip>
              <DropdownMenuContent className="bg-popover">
                <DropdownMenuItem onClick={() => handleFavorite(true)} className="gap-2">
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  <span>Favoritar {selectedCount} anime(s)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFavorite(false)} className="gap-2">
                  <HeartOff className="h-4 w-4 text-muted-foreground" />
                  <span>Desfavoritar {selectedCount} anime(s)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Adicionar à Lista */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5" disabled={isLoading}>
                      <List className="h-4 w-4 text-purple-500" />
                      <span className="hidden lg:inline">Lista</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Adicionar a uma lista</TooltipContent>
              </Tooltip>
              <DropdownMenuContent className="bg-popover w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Adicionar a:
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {lists && lists.length > 0 ? (
                  lists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                      className="gap-2"
                    >
                      <List className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{list.name}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    Nenhuma lista criada
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-6 w-px bg-border shrink-0 hidden sm:block" />

          {/* Grupo 4: Gerenciamento */}
          <div className="flex items-center gap-1">
            {/* Arquivar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={isLoading}
                >
                  <Archive className="h-4 w-4 text-amber-500" />
                  <span className="hidden xl:inline">Arquivar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Arquivar {selectedCount} anime(s)</TooltipContent>
            </Tooltip>

            {/* Deletar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden xl:inline">Excluir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir {selectedCount} anime(s)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-6 w-px bg-border shrink-0" />

          {/* Fechar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClearSelection}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancelar seleção</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir {selectedCount} anime(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação <strong>não pode ser desfeita</strong>. Todos os dados dos animes selecionados serão removidos permanentemente, incluindo progresso, notas e avaliações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                `Excluir ${selectedCount} anime(s)`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de arquivamento */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Arquivar {selectedCount} anime(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os animes arquivados não aparecerão mais na sua lista principal, mas você ainda poderá acessá-los na seção de arquivados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkArchive.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={bulkArchive.isPending}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              {bulkArchive.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Arquivando...
                </>
              ) : (
                `Arquivar ${selectedCount} anime(s)`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de status "Dropped" */}
      <AlertDialog open={showStatusConfirm === 'dropped'} onOpenChange={(open) => !open && setShowStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Marcar {selectedCount} anime(s) como Dropado?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Marcar animes como "Dropado" indica que você desistiu de assisti-los. Você pode alterar o status novamente a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdateStatus.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeStatusChange('dropped')}
              disabled={bulkUpdateStatus.isPending}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {bulkUpdateStatus.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                `Marcar ${selectedCount} como Dropado`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para dar nota */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-kintsugi" />
              Dar nota aos animes selecionados
            </DialogTitle>
            <DialogDescription>
              A nota será aplicada a todos os {selectedCount} anime(s) selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <StarRating
              rating={selectedRating}
              onRatingChange={setSelectedRating}
              size="lg"
            />
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-kintsugi">
                {selectedRating > 0 ? selectedRating : '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedRating === 0 && 'Clique nas estrelas para selecionar'}
                {selectedRating === 1 && 'Péssimo'}
                {selectedRating === 2 && 'Ruim'}
                {selectedRating === 3 && 'Regular'}
                {selectedRating === 4 && 'Bom'}
                {selectedRating === 5 && 'Excelente'}
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={() => setShowRatingDialog(false)}
                className="flex-1"
                disabled={bulkUpdateRating.isPending}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleRatingConfirm} 
                disabled={selectedRating === 0 || bulkUpdateRating.isPending}
                className="flex-1 bg-kintsugi hover:bg-kintsugi/90"
              >
                {bulkUpdateRating.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  `Aplicar Nota`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
