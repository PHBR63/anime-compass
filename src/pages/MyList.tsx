import { useState, useMemo, useEffect } from 'react';
import { Search, Grid, List as ListIcon, Plus, Edit, X } from 'lucide-react';
import { SelectableAnimeGrid } from '@/components/anime/SelectableAnimeGrid';
import { AnimeListItem } from '@/components/anime/AnimeListItem';
import { BulkActionsBar } from '@/components/anime/BulkActionsBar';
import { StatusFilter } from '@/components/anime/StatusFilter';
import { AdvancedFilters, FilterOptions, SortOptions, SortOption } from '@/components/anime/AdvancedFilters';
import { ListsSection } from '@/components/lists/ListsSection';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];
type ViewMode = 'grid' | 'list';

// Valores padrão para filtros e ordenação
const defaultFilters: FilterOptions = {
  onlyFavorites: false,
  minRating: 0,
  hasNotes: false,
};

const defaultSort: SortOptions = {
  sortBy: 'updated',
  direction: 'desc',
};

export default function MyList() {
  const [activeStatus, setActiveStatus] = useState<AnimeStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [sort, setSort] = useState<SortOptions>(defaultSort);
  
  const { data: entries, isLoading } = useAnimeEntries();

  // Filtrar e ordenar entradas
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    
    let result = entries.filter(e => !e.is_archived);
    
    // Filtro por status
    if (activeStatus !== 'all') {
      result = result.filter(e => e.status === activeStatus);
    }
    
    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(query)
      );
    }

    // Filtros avançados
    if (filters.onlyFavorites) {
      result = result.filter(e => e.is_favorite);
    }
    if (filters.minRating > 0) {
      result = result.filter(e => e.rating && e.rating >= filters.minRating);
    }
    if (filters.hasNotes) {
      result = result.filter(e => e.notes && e.notes.trim().length > 0);
    }

    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'progress':
          const progressA = a.total_episodes ? (a.episodes_watched || 0) / a.total_episodes : 0;
          const progressB = b.total_episodes ? (b.episodes_watched || 0) / b.total_episodes : 0;
          comparison = progressA - progressB;
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'added':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [entries, activeStatus, searchQuery, filters, sort]);

  // Contadores por status
  const statusCounts = useMemo(() => {
    if (!entries) return {
      all: 0,
      watching: 0,
      completed: 0,
      paused: 0,
      dropped: 0,
      not_started: 0,
    };

    const nonArchived = entries.filter(e => !e.is_archived);
    
    return {
      all: nonArchived.length,
      watching: nonArchived.filter(e => e.status === 'watching').length,
      completed: nonArchived.filter(e => e.status === 'completed').length,
      paused: nonArchived.filter(e => e.status === 'paused').length,
      dropped: nonArchived.filter(e => e.status === 'dropped').length,
      not_started: nonArchived.filter(e => e.status === 'not_started').length,
    };
  }, [entries]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A para selecionar todos
      if (e.ctrlKey && e.key === 'a' && isSelectionMode) {
        e.preventDefault();
        setSelectedIds(filteredEntries.map(entry => entry.id));
      }
      // Escape para cancelar seleção
      if (e.key === 'Escape' && isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, filteredEntries]);

  // Handler para limpar seleção
  const handleClearSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  // Handler para selecionar todos
  const handleSelectAll = () => {
    setSelectedIds(filteredEntries.map(entry => entry.id));
  };

  // Handler para toggle do modo de seleção
  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      handleClearSelection();
    } else {
      setIsSelectionMode(true);
    }
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Minha Lista
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus animes e acompanhe seu progresso
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={isSelectionMode ? "default" : "outline"}
            onClick={handleToggleSelectionMode}
          >
            {isSelectionMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Editar em Massa
              </>
            )}
          </Button>
          <Link to="/discover">
            <Button variant="glow">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Anime
            </Button>
          </Link>
        </div>
      </div>

      {/* Seção de Listas Personalizadas */}
      <ListsSection />

      <Separator className="my-6" />

      {/* Filters bar */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar animes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          
          {/* View mode toggle e filtros avançados */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
                title="Visualização em grade"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                title="Visualização em lista"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <AdvancedFilters
              filters={filters}
              sort={sort}
              onFiltersChange={setFilters}
              onSortChange={setSort}
            />
          </div>
        </div>

        {/* Status filter */}
        <StatusFilter
          activeStatus={activeStatus}
          onChange={setActiveStatus}
          counts={statusCounts}
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Mostrando {filteredEntries.length} anime{filteredEntries.length !== 1 ? 's' : ''}
        {isSelectionMode && selectedIds.length > 0 && (
          <span className="text-primary ml-2">
            ({selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''})
          </span>
        )}
      </p>

      {/* Anime grid/list */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        )
      ) : filteredEntries.length > 0 ? (
        viewMode === 'grid' ? (
          <SelectableAnimeGrid 
            entries={filteredEntries}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <AnimeListItem key={entry.id} entry={entry} />
            ))}
          </div>
        )
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {searchQuery || activeStatus !== 'all' || filters.onlyFavorites || filters.minRating > 0 || filters.hasNotes
              ? 'Nenhum anime encontrado com esses filtros'
              : 'Sua lista está vazia. Que tal adicionar alguns animes?'
            }
          </p>
          {!searchQuery && activeStatus === 'all' && !filters.onlyFavorites && filters.minRating === 0 && !filters.hasNotes && (
            <Link to="/discover">
              <Button variant="glow">
                <Plus className="h-4 w-4 mr-2" />
                Descobrir Animes
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Barra de ações em massa */}
      <BulkActionsBar
        selectedIds={selectedIds}
        totalItems={filteredEntries.length}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
      />
    </div>
  );
}
