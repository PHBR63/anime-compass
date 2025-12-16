import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Grid, List as ListIcon, Plus } from 'lucide-react';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { StatusFilter } from '@/components/anime/StatusFilter';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];
type ViewMode = 'grid' | 'list';

export default function MyList() {
  const [activeStatus, setActiveStatus] = useState<AnimeStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  const { data: entries, isLoading } = useAnimeEntries();

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    
    let result = entries.filter(e => !e.is_archived);
    
    if (activeStatus !== 'all') {
      result = result.filter(e => e.status === activeStatus);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [entries, activeStatus, searchQuery]);

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

  return (
    <div className="space-y-6 pt-12 md:pt-0">
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
        
        <Link to="/discover">
          <Button variant="glow">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Anime
          </Button>
        </Link>
      </div>

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
          
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
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
      </p>

      {/* Anime grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : filteredEntries.length > 0 ? (
        <AnimeGrid entries={filteredEntries} />
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {searchQuery || activeStatus !== 'all' 
              ? 'Nenhum anime encontrado com esses filtros'
              : 'Sua lista está vazia. Que tal adicionar alguns animes?'
            }
          </p>
          {!searchQuery && activeStatus === 'all' && (
            <Link to="/discover">
              <Button variant="glow">
                <Plus className="h-4 w-4 mr-2" />
                Descobrir Animes
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
