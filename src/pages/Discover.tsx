import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, TrendingUp, Sparkles, Filter, Tv, Loader2, Star, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JikanAnimeCard } from '@/components/anime/JikanAnimeCard';
import { 
  useInfiniteTopAnimes, 
  useInfiniteSeasonNow, 
  useInfiniteSearchAnimes, 
  useInfiniteAnimesByGenre,
  GENRES,
  JikanAnime
} from '@/hooks/useJikanApi';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';

// Página de descoberta de animes com scroll infinito
export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'season' | 'top'>('season');
  const [selectedAnime, setSelectedAnime] = useState<JikanAnime | null>(null);
  
  // Ref para observar scroll infinito
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce da pesquisa
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Hooks de dados com paginação infinita
  const {
    data: topAnimesData,
    fetchNextPage: fetchNextTop,
    hasNextPage: hasNextTop,
    isFetchingNextPage: isFetchingTop,
    isLoading: loadingTop
  } = useInfiniteTopAnimes();

  const {
    data: seasonAnimesData,
    fetchNextPage: fetchNextSeason,
    hasNextPage: hasNextSeason,
    isFetchingNextPage: isFetchingSeason,
    isLoading: loadingSeason
  } = useInfiniteSeasonNow();

  const {
    data: searchData,
    fetchNextPage: fetchNextSearch,
    hasNextPage: hasNextSearch,
    isFetchingNextPage: isFetchingSearch,
    isLoading: loadingSearch
  } = useInfiniteSearchAnimes(debouncedQuery);

  const {
    data: genreData,
    fetchNextPage: fetchNextGenre,
    hasNextPage: hasNextGenre,
    isFetchingNextPage: isFetchingGenre,
    isLoading: loadingGenre
  } = useInfiniteAnimesByGenre(selectedGenre || 0);

  // Função para remover duplicatas por mal_id
  const removeDuplicates = (animes: JikanAnime[]): JikanAnime[] => {
    const seen = new Set<number>();
    return animes.filter((anime) => {
      if (seen.has(anime.mal_id)) {
        return false;
      }
      seen.add(anime.mal_id);
      return true;
    });
  };

  // Flatten dos dados paginados e remoção de duplicatas
  const topAnimes = removeDuplicates(topAnimesData?.pages.flatMap(page => page.data) || []);
  const seasonAnimes = removeDuplicates(seasonAnimesData?.pages.flatMap(page => page.data) || []);
  const searchAnimes = removeDuplicates(searchData?.pages.flatMap(page => page.data) || []);
  const genreAnimes = removeDuplicates(genreData?.pages.flatMap(page => page.data) || []);

  // Verifica estados
  const isSearching = debouncedQuery.length >= 2;
  const isFilteringByGenre = selectedGenre !== null;

  // Determina qual função de carregar mais usar
  const getLoadMoreConfig = useCallback(() => {
    if (isSearching) {
      return { fetch: fetchNextSearch, hasNext: hasNextSearch, isFetching: isFetchingSearch };
    }
    if (isFilteringByGenre) {
      return { fetch: fetchNextGenre, hasNext: hasNextGenre, isFetching: isFetchingGenre };
    }
    if (activeTab === 'top') {
      return { fetch: fetchNextTop, hasNext: hasNextTop, isFetching: isFetchingTop };
    }
    return { fetch: fetchNextSeason, hasNext: hasNextSeason, isFetching: isFetchingSeason };
  }, [
    isSearching, isFilteringByGenre, activeTab,
    fetchNextSearch, hasNextSearch, isFetchingSearch,
    fetchNextGenre, hasNextGenre, isFetchingGenre,
    fetchNextTop, hasNextTop, isFetchingTop,
    fetchNextSeason, hasNextSeason, isFetchingSeason
  ]);

  // Observer para scroll infinito
  useEffect(() => {
    const config = getLoadMoreConfig();
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && config.hasNext && !config.isFetching) {
          config.fetch();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [getLoadMoreConfig]);

  // Funções de controle
  const handleGenreClick = (genreId: number) => {
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
    } else {
      setSelectedGenre(genreId);
      setSearchQuery('');
      setDebouncedQuery('');
    }
  };

  const clearFilters = () => {
    setSelectedGenre(null);
    setSearchQuery('');
    setDebouncedQuery('');
  };

  // Skeleton de loading
  const LoadingSkeleton = ({ count = 12 }: { count?: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );

  // Botão de carregar mais
  const LoadMoreButton = () => {
    const config = getLoadMoreConfig();
    if (!config.hasNext) return null;
    
    return (
      <div ref={loadMoreRef} className="flex justify-center py-8">
        <Button
          variant="outline"
          onClick={() => config.fetch()}
          disabled={config.isFetching}
          className="gap-2"
        >
          {config.isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Carregar Mais
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          Descubra Novos <span className="text-gradient">Animes</span>
        </h1>
        <p className="text-muted-foreground">
          Explore animes reais do MyAnimeList e adicione à sua lista
        </p>
      </div>

      {/* Barra de pesquisa */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-lg bg-secondary/50 border-border/50 rounded-xl"
          />
          {loadingSearch && debouncedQuery && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
          )}
        </div>
      </div>

      {/* Filtros de gênero */}
      <div className="flex flex-wrap justify-center gap-2">
        {GENRES.map((genre) => (
          <Badge
            key={genre.id}
            variant={selectedGenre === genre.id ? "default" : "outline"}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
              selectedGenre === genre.id 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10 hover:border-primary/50'
            }`}
            onClick={() => handleGenreClick(genre.id)}
          >
            {genre.name}
          </Badge>
        ))}
        {(isSearching || isFilteringByGenre) && (
          <Badge
            variant="secondary"
            className="px-4 py-2 text-sm cursor-pointer hover:bg-destructive/20"
            onClick={clearFilters}
          >
            Limpar Filtros
          </Badge>
        )}
      </div>

      {/* Resultados da pesquisa */}
      {isSearching && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">
                Resultados para "{debouncedQuery}"
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {searchAnimes.length} encontrados
            </span>
          </div>
          
          {loadingSearch ? (
            <LoadingSkeleton />
          ) : searchAnimes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchAnimes.map((anime) => (
                  <JikanAnimeCard key={anime.mal_id} anime={anime} />
                ))}
              </div>
              <LoadMoreButton />
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum resultado encontrado para "{debouncedQuery}"
            </p>
          )}
        </section>
      )}

      {/* Animes por gênero */}
      {isFilteringByGenre && !isSearching && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">
                {GENRES.find(g => g.id === selectedGenre)?.name || 'Gênero'}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {genreAnimes.length} animes
            </span>
          </div>
          
          {loadingGenre ? (
            <LoadingSkeleton />
          ) : genreAnimes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {genreAnimes.map((anime) => (
                  <JikanAnimeCard key={anime.mal_id} anime={anime} />
                ))}
              </div>
              <LoadMoreButton />
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum anime encontrado neste gênero
            </p>
          )}
        </section>
      )}

      {/* Seções padrão (quando não há pesquisa ou filtro) */}
      {!isSearching && !isFilteringByGenre && (
        <>
          {/* Tabs de navegação */}
          <div className="flex justify-center gap-2">
            <Button
              variant={activeTab === 'season' ? 'default' : 'outline'}
              onClick={() => setActiveTab('season')}
              className="gap-2"
            >
              <Tv className="h-4 w-4" />
              Temporada Atual
            </Button>
            <Button
              variant={activeTab === 'top' ? 'default' : 'outline'}
              onClick={() => setActiveTab('top')}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Top Animes
            </Button>
          </div>

          {/* Conteúdo baseado na tab ativa */}
          {activeTab === 'season' ? (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Tv className="h-5 w-5 text-accent" />
                  <h2 className="font-display text-xl font-semibold">Temporada Atual</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {seasonAnimes.length} animes
                </span>
              </div>
              
              {loadingSeason ? (
                <LoadingSkeleton />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {seasonAnimes.map((anime) => (
                      <JikanAnimeCard key={anime.mal_id} anime={anime} />
                    ))}
                  </div>
                  <LoadMoreButton />
                </>
              )}
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-semibold">Top Animes de Todos os Tempos</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {topAnimes.length} animes
                </span>
              </div>
              
              {loadingTop ? (
                <LoadingSkeleton />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {topAnimes.map((anime, index) => (
                      <JikanAnimeCard 
                        key={anime.mal_id} 
                        anime={anime} 
                        rank={index + 1}
                      />
                    ))}
                  </div>
                  <LoadMoreButton />
                </>
              )}
            </section>
          )}

          {/* Destaques da temporada */}
          {activeTab === 'season' && seasonAnimes.length > 6 && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-warning" />
                <h2 className="font-display text-xl font-semibold">Destaques</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasonAnimes.slice(0, 3).map((anime, index) => (
                  <div
                    key={`highlight-${anime.mal_id}`}
                    className="glass-card p-4 flex gap-4 hover:border-primary/30 transition-colors cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setSelectedAnime(anime)}
                  >
                    <img
                      src={anime.images.jpg.image_url}
                      alt={anime.title}
                      className="w-20 h-28 object-cover rounded-lg"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-1">{anime.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {anime.synopsis || 'Sem sinopse disponível'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {anime.genres.slice(0, 2).map((genre) => (
                          <Badge key={genre.mal_id} variant="secondary" className="text-xs">
                            {genre.name}
                          </Badge>
                        ))}
                      </div>
                      {anime.score && (
                        <p className="text-xs text-primary mt-2 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-primary" />
                          Nota: {anime.score.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal de detalhes */}
      {selectedAnime && (
        <AnimeDetailModal
          open={!!selectedAnime}
          onOpenChange={(open) => !open && setSelectedAnime(null)}
          jikanAnime={selectedAnime}
        />
      )}
    </div>
  );
}
