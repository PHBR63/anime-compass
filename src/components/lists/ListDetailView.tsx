import { useState, useMemo } from 'react';
import { ArrowLeft, Globe, Lock, Pencil, GripVertical, LayoutGrid, Share2, Check, Copy, Plus, ArrowUpDown, Star, Calendar, Clock, Hash, SortAsc, SortDesc, List, Search, X, CalendarDays, Filter, Eye, Pause, CheckCircle2, XCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { SortableAnimeItem } from './SortableAnimeItem';
import { SortableAnimeCard } from './SortableAnimeCard';
import { EditListModal } from './EditListModal';
import { AddAnimesToListModal } from './AddAnimesToListModal';
import { useListItems, useRemoveFromList, useReorderListItems } from '@/hooks/useCustomLists';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { CustomList } from '@/hooks/useCustomLists';

import { toast } from 'sonner';

interface ListDetailViewProps {
  list: CustomList;
  onBack: () => void;
}

type ViewMode = 'grid' | 'reorder';

// Tipos de ordenação disponíveis
type SortField = 'custom' | 'title' | 'rating' | 'episodes' | 'status' | 'added_date' | 'year';
type SortDirection = 'asc' | 'desc';

// Tipos de filtro de status
type StatusFilter = 'all' | 'watching' | 'completed' | 'paused' | 'not_started' | 'dropped';

interface SortOption {
  field: SortField;
  label: string;
  icon: typeof Star;
}

// Opções de filtro de status
interface StatusFilterOption {
  value: StatusFilter;
  label: string;
  icon: typeof Eye;
  color?: string;
}

const statusFilterOptions: StatusFilterOption[] = [
  { value: 'all', label: 'Todos', icon: List },
  { value: 'watching', label: 'Assistindo', icon: Play, color: 'text-blue-500' },
  { value: 'completed', label: 'Completo', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'paused', label: 'Pausado', icon: Pause, color: 'text-yellow-500' },
  { value: 'not_started', label: 'Não iniciado', icon: Eye, color: 'text-muted-foreground' },
  { value: 'dropped', label: 'Dropado', icon: XCircle, color: 'text-red-500' },
];

// Opções de ordenação
const sortOptions: SortOption[] = [
  { field: 'custom', label: 'Ordem personalizada', icon: List },
  { field: 'title', label: 'Título', icon: SortAsc },
  { field: 'rating', label: 'Nota', icon: Star },
  { field: 'episodes', label: 'Episódios', icon: Hash },
  { field: 'status', label: 'Status', icon: Clock },
  { field: 'added_date', label: 'Data de adição', icon: Calendar },
  { field: 'year', label: 'Ano', icon: CalendarDays },
];

/**
 * Visualização detalhada de uma lista personalizada com suporte a drag-and-drop
 */
export function ListDetailView({ list, onBack }: ListDetailViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('custom');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: items, isLoading } = useListItems(list.id);
  const removeFromList = useRemoveFromList();
  const reorderItems = useReorderListItems();
  const haptic = useHapticFeedback();

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

  // Sensores para drag-and-drop com melhor UX
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Menor distância para ativar mais rápido
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  // Mapeamento de ordem de status
  const statusOrder: Record<string, number> = {
    watching: 1,
    completed: 2,
    paused: 3,
    not_started: 4,
    dropped: 5,
  };

  // Extrair os anime_entries, filtrar por busca e status, ordenar
  const sortedItems = useMemo(() => {
    if (!items) return [];
    
    let sorted = items
      .map((item: any) => ({
        itemId: item.id,
        animeEntryId: item.anime_entry_id,
        anime: item.anime_entry,
        position: item.position,
        createdAt: item.created_at,
      }))
      .filter((item: any) => item.anime);

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      sorted = sorted.filter((item: any) => item.anime.status === statusFilter);
    }

    // Aplicar filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      sorted = sorted.filter((item: any) => 
        item.anime.title?.toLowerCase().includes(query)
      );
    }

    // Aplicar ordenação baseada no campo selecionado
    if (sortField === 'custom') {
      sorted.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
    } else {
      sorted.sort((a: any, b: any) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'title':
            comparison = (a.anime.title || '').localeCompare(b.anime.title || '');
            break;
          case 'rating':
            comparison = (a.anime.rating || 0) - (b.anime.rating || 0);
            break;
          case 'episodes':
            comparison = (a.anime.episodes_watched || 0) - (b.anime.episodes_watched || 0);
            break;
          case 'status':
            comparison = (statusOrder[a.anime.status] || 99) - (statusOrder[b.anime.status] || 99);
            break;
          case 'added_date':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'year':
            // Extrair ano do started_at ou created_at do anime
            const yearA = a.anime.started_at ? new Date(a.anime.started_at).getFullYear() : 0;
            const yearB = b.anime.started_at ? new Date(b.anime.started_at).getFullYear() : 0;
            comparison = yearA - yearB;
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return sorted;
  }, [items, sortField, sortDirection, searchQuery, statusFilter]);

  // Obter opção de filtro atual
  const currentStatusFilter = statusFilterOptions.find(opt => opt.value === statusFilter);

  // Item ativo para o DragOverlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return sortedItems?.find((item: any) => item.itemId === activeId);
  }, [activeId, sortedItems]);

  // Handler para mudar ordenação
  const handleSortChange = (field: SortField) => {
    if (field === sortField && field !== 'custom') {
      // Alternar direção se for o mesmo campo
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Se mudar para ordem personalizada, voltar para modo grid
    if (field === 'custom' && viewMode === 'reorder') {
      setViewMode('grid');
    }
  };

  const entries = sortedItems.map((item: any) => item.anime);

  // Pegar imagens para o banner
  const bannerImages = entries.slice(0, 3).map((e: any) => e.image_url);

  // Handler para início do drag - com feedback háptico
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    haptic.medium(); // Vibração média ao iniciar arrasto
  };

  // Handler para drag end - com feedback háptico
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item: any) => item.itemId === active.id);
      const newIndex = sortedItems.findIndex((item: any) => item.itemId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedItems, oldIndex, newIndex);
        const newItemIds = newOrder.map((item: any) => item.itemId);

        // Vibração de sucesso ao soltar em nova posição
        haptic.success();

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
    } else {
      // Vibração leve se soltou no mesmo lugar
      haptic.light();
    }
  };

  // Handler para cancelar drag - com feedback háptico
  const handleDragCancel = () => {
    setActiveId(null);
    haptic.light(); // Vibração leve ao cancelar
  };

  // Handler para remover item
  const handleRemove = (animeEntryId: string) => {
    removeFromList.mutate({ listId: list.id, animeEntryId });
  };

  // Obter ícone e label da ordenação atual
  const currentSort = sortOptions.find(opt => opt.field === sortField);

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
          <div className="flex flex-col gap-4">
            {/* Título e badge */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">
                  {list.name}
                </h1>
                <Badge 
                  variant={list.is_public ? "success" : "secondary"}
                  className="shrink-0 transition-all duration-200"
                >
                  {list.is_public ? (
                    <><Globe className="h-3 w-3" /> Pública</>
                  ) : (
                    <><Lock className="h-3 w-3" /> Privada</>
                  )}
                </Badge>
              </div>
              
              {list.description && (
                <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                  {list.description}
                </p>
              )}
              
              <p className="text-sm text-muted-foreground">
                {entries.length} anime{entries.length !== 1 && 's'}
              </p>
            </div>

            {/* Ações - responsivo */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Campo de busca */}
              <div className="relative flex-1 min-w-[140px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-8 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-8 w-8 hover:bg-transparent"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
              {/* Dropdown de filtro de status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={statusFilter !== 'all' ? 'default' : 'outline'} 
                    size="sm" 
                    className="h-8 gap-1.5"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentStatusFilter?.label || 'Filtrar'}</span>
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {sortedItems.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusFilterOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = statusFilter === option.value;
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setStatusFilter(option.value)}
                        className={isActive ? 'bg-accent' : ''}
                      >
                        <Icon className={`h-4 w-4 mr-2 ${option.color || ''}`} />
                        {option.label}
                        {isActive && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dropdown de ordenação */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentSort?.label || 'Ordenar'}</span>
                    {sortField !== 'custom' && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sortOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = sortField === option.field;
                    return (
                      <DropdownMenuItem
                        key={option.field}
                        onClick={() => handleSortChange(option.field)}
                        className={isActive ? 'bg-accent' : ''}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {option.label}
                        {isActive && option.field !== 'custom' && (
                          <span className="ml-auto">
                            {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                          </span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

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
                  onClick={() => {
                    setViewMode('reorder');
                    // Ao entrar no modo reordenar, voltar para ordem personalizada
                    if (sortField !== 'custom') {
                      setSortField('custom');
                    }
                  }}
                  title="Modo reordenar"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Botão compartilhar (apenas para listas públicas) */}
              {list.is_public && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Share2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Compartilhar</span>
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
              
              <Button variant="outline" size="sm" className="h-8" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
              
              <Button variant="outline" size="sm" className="h-8" onClick={() => setShowEditModal(true)}>
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
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
          // Modo Grid com Drag-and-Drop animado
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="flex items-center gap-2 text-sm text-muted-foreground mb-4 bg-secondary/50 p-3 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <GripVertical className="h-4 w-4" />
              </motion.div>
              <span>Passe o mouse sobre os cards e arraste para reordenar</span>
            </motion.div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              measuring={{
                droppable: {
                  strategy: MeasuringStrategy.Always,
                },
              }}
            >
              <SortableContext
                items={sortedItems.map((item: any) => item.itemId)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  <AnimatePresence mode="popLayout">
                    {sortedItems.map((item: any) => (
                      <motion.div 
                        key={item.itemId} 
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ 
                          opacity: activeId && activeId !== item.itemId ? 0.6 : 1,
                          scale: activeId && activeId !== item.itemId ? 0.97 : 1,
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 350, damping: 30 },
                          opacity: { duration: 0.2 },
                          scale: { duration: 0.2 },
                        }}
                      >
                        <SortableAnimeCard
                          id={item.itemId}
                          entry={item.anime}
                          onRemove={() => handleRemove(item.animeEntryId)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>

              {/* Overlay animado para o item sendo arrastado no grid */}
              <DragOverlay dropAnimation={{
                duration: 300,
                easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}>
                {activeItem ? (
                  <motion.div 
                    className="w-[160px] sm:w-[180px] lg:w-[200px]"
                    initial={{ scale: 1, rotate: 0 }}
                    animate={{ 
                      scale: 1.08, 
                      rotate: 2,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <SortableAnimeCard
                      id={activeItem.itemId}
                      entry={activeItem.anime}
                      isOverlay
                    />
                  </motion.div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        ) : (
          // Modo Reordenar com Drag-and-Drop animado
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="flex items-center gap-2 text-sm text-muted-foreground mb-4 bg-secondary/50 p-3 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <GripVertical className="h-4 w-4" />
              </motion.div>
              <span>Arraste os itens para reordenar a lista</span>
            </motion.div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              measuring={{
                droppable: {
                  strategy: MeasuringStrategy.Always,
                },
              }}
            >
              <SortableContext
                items={sortedItems.map((item: any) => item.itemId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {sortedItems.map((item: any, index: number) => (
                      <motion.div 
                        key={item.itemId} 
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: activeId && activeId !== item.itemId ? 0.5 : 1,
                          x: 0,
                          scale: activeId && activeId !== item.itemId ? 0.98 : 1,
                        }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 350, damping: 25 },
                          opacity: { duration: 0.2 },
                          scale: { duration: 0.2 },
                        }}
                        className="flex items-center gap-2"
                      >
                        <motion.span 
                          className="w-6 text-center text-sm text-muted-foreground font-medium"
                          animate={{
                            scale: activeId === item.itemId ? 1.2 : 1,
                            color: activeId === item.itemId ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                          }}
                        >
                          {index + 1}
                        </motion.span>
                        <div className="flex-1">
                          <SortableAnimeItem
                            id={item.itemId}
                            anime={item.anime}
                            onRemove={() => handleRemove(item.animeEntryId)}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>

              {/* Overlay animado para o item sendo arrastado */}
              <DragOverlay dropAnimation={{
                duration: 250,
                easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}>
                {activeItem ? (
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ scale: 1, rotate: 0 }}
                    animate={{ 
                      scale: 1.02, 
                      rotate: 1,
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <span className="w-6 text-center text-sm text-primary font-bold">
                      •
                    </span>
                    <div className="flex-1">
                      <SortableAnimeItem
                        id={activeItem.itemId}
                        anime={activeItem.anime}
                        isOverlay
                      />
                    </div>
                  </motion.div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        )
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Esta lista está vazia
          </p>
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar animes
          </Button>
        </div>
      )}

      {/* Modal de edição */}
      <EditListModal
        list={list}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
      
      {/* Modal de adicionar animes */}
      <AddAnimesToListModal
        listId={list.id}
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </div>
  );
}
