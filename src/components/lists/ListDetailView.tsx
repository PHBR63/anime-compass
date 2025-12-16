import { useState, useMemo } from 'react';
import { ArrowLeft, Globe, Lock, Pencil, GripVertical, LayoutGrid, Share2, Check, Copy } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { SortableAnimeItem } from './SortableAnimeItem';
import { EditListModal } from './EditListModal';
import { useListItems, useRemoveFromList, useReorderListItems } from '@/hooks/useCustomLists';
import type { CustomList } from '@/hooks/useCustomLists';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ListDetailViewProps {
  list: CustomList;
  onBack: () => void;
}

type ViewMode = 'grid' | 'reorder';

/**
 * Visualização detalhada de uma lista personalizada com suporte a drag-and-drop
 */
export function ListDetailView({ list, onBack }: ListDetailViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { data: items, isLoading } = useListItems(list.id);
  const removeFromList = useRemoveFromList();
  const reorderItems = useReorderListItems();

  // URL de compartilhamento
  const shareUrl = `${window.location.origin}/shared/list/${list.id}`;

  // Handler para copiar link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  // Sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Extrair os anime_entries e seus IDs dos items
  const sortedItems = useMemo(() => {
    if (!items) return [];
    return items
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .map((item: any) => ({
        itemId: item.id,
        animeEntryId: item.anime_entry_id,
        anime: item.anime_entry,
        position: item.position,
      }))
      .filter((item: any) => item.anime);
  }, [items]);

  const entries = sortedItems.map((item: any) => item.anime);

  // Pegar imagens para o banner
  const bannerImages = entries.slice(0, 3).map((e: any) => e.image_url);

  // Handler para drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item: any) => item.itemId === active.id);
      const newIndex = sortedItems.findIndex((item: any) => item.itemId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedItems, oldIndex, newIndex);
        const newItemIds = newOrder.map((item: any) => item.itemId);

        // Atualizar no banco
        reorderItems.mutate(
          { listId: list.id, itemIds: newItemIds },
          {
            onSuccess: () => {
              toast.success('Ordem atualizada!');
            },
          }
        );
      }
    }
  };

  // Handler para remover item
  const handleRemove = (animeEntryId: string) => {
    removeFromList.mutate({ listId: list.id, animeEntryId });
  };

  return (
    <div className="space-y-6">
      {/* Header com banner */}
      <div className="relative">
        {/* Banner com blur */}
        <div className="absolute inset-0 h-40 overflow-hidden rounded-xl">
          {bannerImages.length > 0 ? (
            <div className="flex w-full h-full">
              {bannerImages.map((url: string, index: number) => (
                <div key={index} className="flex-1 relative overflow-hidden">
                  <img
                    src={url || '/placeholder.svg'}
                    alt=""
                    className="w-full h-full object-cover blur-sm scale-110"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        {/* Conteúdo do header */}
        <div className="relative pt-4 pb-2 px-4">
          {/* Botão voltar */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {/* Info da lista */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">
                  {list.name}
                </h1>
                <Badge 
                  variant="outline" 
                  className={cn(
                    list.is_public 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : ""
                  )}
                >
                  {list.is_public ? (
                    <><Globe className="h-3 w-3 mr-1" /> Pública</>
                  ) : (
                    <><Lock className="h-3 w-3 mr-1" /> Privada</>
                  )}
                </Badge>
              </div>
              
              {list.description && (
                <p className="text-muted-foreground max-w-xl">
                  {list.description}
                </p>
              )}
              
              <p className="text-sm text-muted-foreground">
                {entries.length} anime{entries.length !== 1 && 's'}
              </p>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              {/* Toggle de visualização */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'reorder' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('reorder')}
                  title="Modo reordenar"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </div>
              {/* Botão compartilhar (apenas para listas públicas) */}
              {list.is_public && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-1">Compartilhar lista</h4>
                        <p className="text-xs text-muted-foreground">
                          Qualquer pessoa com o link pode ver esta lista
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={shareUrl} 
                          readOnly 
                          className="text-xs h-9"
                        />
                        <Button 
                          size="sm" 
                          onClick={handleCopyLink}
                          className="shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : entries.length > 0 ? (
        viewMode === 'grid' ? (
          // Modo Grid normal
          <AnimeGrid entries={entries} />
        ) : (
          // Modo Reordenar com Drag-and-Drop
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <GripVertical className="h-4 w-4" />
              <span>Arraste os itens para reordenar</span>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedItems.map((item: any) => item.itemId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedItems.map((item: any, index: number) => (
                    <div key={item.itemId} className="flex items-center gap-2">
                      <span className="w-6 text-center text-sm text-muted-foreground font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <SortableAnimeItem
                          id={item.itemId}
                          anime={item.anime}
                          onRemove={() => handleRemove(item.animeEntryId)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Esta lista está vazia
          </p>
          <p className="text-sm text-muted-foreground">
            Use a edição em massa para adicionar animes a esta lista
          </p>
        </div>
      )}

      {/* Modal de edição */}
      <EditListModal
        list={list}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </div>
  );
}
