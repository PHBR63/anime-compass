import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Grid, List as ListIcon } from 'lucide-react';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { StatusFilter } from '@/components/anime/StatusFilter';
import { mockUserEntries } from '@/data/mockData';
import { AnimeStatus } from '@/types/anime';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

export default function MyList() {
  const [activeStatus, setActiveStatus] = useState<AnimeStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredEntries = useMemo(() => {
    let entries = mockUserEntries.filter(e => !e.isArchived);
    
    if (activeStatus !== 'all') {
      entries = entries.filter(e => e.status === activeStatus);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(e => 
        e.anime.title.toLowerCase().includes(query) ||
        e.anime.titleEnglish?.toLowerCase().includes(query)
      );
    }
    
    return entries;
  }, [activeStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<AnimeStatus | 'all', number> = {
      all: mockUserEntries.filter(e => !e.isArchived).length,
      watching: 0,
      completed: 0,
      paused: 0,
      dropped: 0,
      planned: 0,
    };
    
    mockUserEntries
      .filter(e => !e.isArchived)
      .forEach(e => {
        counts[e.status]++;
      });
    
    return counts;
  }, []);

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          Minha Lista
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seus animes e acompanhe seu progresso
        </p>
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
      <AnimeGrid entries={filteredEntries} />
    </div>
  );
}
