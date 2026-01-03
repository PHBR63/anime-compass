import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, TrendingUp, Sparkles, Filter, Tv, Loader2, Star, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CatalogAnimeCard } from '@/components/anime/CatalogAnimeCard';
import { 
  useTopAnimes, 
  useSeasonAnimes, 
  useSearchAnimes, 
  useAnimesByGenre,
  useAnimeGenres,
  POPULAR_GENRES
} from '@/hooks/useAnimeApi';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';
import { SakuraPetals, WavePattern } from '@/components/backgrounds';
import { AnimatedContent, NeonText } from '@/components/animations';
import { ToriiDivider } from '@/components/decorative';
import type { CatalogAnime } from '@/types/catalog';

/**
 * Página de descoberta de animes com scroll infinito
 * Usa API própria do catálogo local (mais rápida e sem rate limit)
 */
export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'season' | 'top'>('season');
  const [selectedAnime, setSelectedAnime] = useState<CatalogAnime | null>(null);
  
  // Ref para observar scroll infinito
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce da pesquisa
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Buscar gêneros disponíveis do catálogo
  const { data: catalogGenres } = useAnimeGenres();

  // Hooks de dados com paginação infinita (API própria)
  const {
    data: topAnimesData,
    fetchNextPage: fetchNextTop,
    hasNextPage: hasNextTop,
    isFetchingNextPage: isFetchingTop,
    isLoading: loadingTop
  } = useTopAnimes();

  const {
    data: seasonAnimesData,
    fetchNextPage: fetchNextSeason,
    hasNextPage: hasNextSeason,
    isFetchingNextPage: isFetchingSeason,
    isLoading: loadingSeason
  } = useSeasonAnimes();

  const {
    data: searchData,
    fetchNextPage: fetchNextSearch,
    hasNextPage: hasNextSearch,
    isFetchingNextPage: isFetchingSearch,
    isLoading: loadingSearch
  } = useSearchAnimes(debouncedQuery);

  const {
    data: genreData,
    fetchNextPage: fetchNextGenre,
    hasNextPage: hasNextGenre,
    isFetchingNextPage: isFetchingGenre,
    isLoading: loadingGenre
  } = useAnimesByGenre(selectedGenre);

  // Função memoizada para remover duplicatas por mal_id
  const removeDuplicates = useCallback((animes: CatalogAnime[]): CatalogAnime[] => {
    const seen = new Set<number>();
    return animes.filter((anime) => {
      if (seen.has(anime.mal_id)) {
        return false;
      }
      seen.add(anime.mal_id);
      return true;
    });
  }, []);

  // Flatten dos dados paginados e remoção de duplicatas - MEMOIZADO
  const topAnimes = useMemo(() => 
    removeDuplicates(topAnimesData?.pages.flatMap(page => page.data) || []),
    [topAnimesData, removeDuplicates]
  );
  
  const seasonAnimes = useMemo(() => 
    removeDuplicates(seasonAnimesData?.pages.flatMap(page => page.data) || []),
    [seasonAnimesData, removeDuplicates]
  );
  
  const searchAnimes = useMemo(() => 
    removeDuplicates(searchData?.pages.flatMap(page => page.data) || []),
    [searchData, removeDuplicates]
  );
  
  const genreAnimes = useMemo(() => 
    removeDuplicates(genreData?.pages.flatMap(page => page.data) || []),
    [genreData, removeDuplicates]
  );

  // Verifica estados - MEMOIZADO
  const isSearching = useMemo(() => debouncedQuery.length >= 2, [debouncedQuery]);
  const isFilteringByGenre = useMemo(() => selectedGenre !== null, [selectedGenre]);

  // Determina qual função de carregar mais usar - MEMOIZADO
  const loadMoreConfig = useMemo(() => {
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
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && loadMoreConfig.hasNext && !loadMoreConfig.isFetching) {
          loadMoreConfig.fetch();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreConfig]);

  // Gêneros para exibir nos filtros (usa catálogo ou fallback)
  const displayGenres = useMemo(() => {
    if (catalogGenres && catalogGenres.length > 0) {
      // Usar gêneros do catálogo ordenados por contagem
      return catalogGenres.slice(0, 12).map(g => ({ id: g.mal_id, name: g.name }));
    }
    // Fallback para gêneros populares
    return POPULAR_GENRES.map(g => ({ id: g.mal_id, name: g.name }));
  }, [catalogGenres]);

  // Funções de controle - MEMOIZADAS
  const handleGenreClick = useCallback((genreId: number) => {
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
    } else {
      setSelectedGenre(genreId);
      setSearchQuery('');
      setDebouncedQuery('');
    }
  }, [selectedGenre]);

  const clearFilters = useCallback(() => {
    setSelectedGenre(null);
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSelectAnime = useCallback((anime: CatalogAnime) => {
    setSelectedAnime(anime);
  }, []);

  const handleCloseModal = useCallback((open: boolean) => {
    if (!open) setSelectedAnime(null);
  }, []);

  // Skeleton de loading - MEMOIZADO
  const LoadingSkeleton = useMemo(() => ({ count = 12 }: { count?: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  ), []);

  // Botão de carregar mais
  const LoadMoreButton = useCallback(() => {
    if (!loadMoreConfig.hasNext) return null;
    
    return (
      <div ref={loadMoreRef} className="flex justify-center py-8">
        <Button
          variant="outline"
          onClick={() => loadMoreConfig.fetch()}
          disabled={loadMoreConfig.isFetching}
          className="gap-2"
        >
          {loadMoreConfig.isFetching ? (
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
  }, [loadMoreConfig]);

  // Destaques memoizados
  const highlightAnimes = useMemo(() => seasonAnimes.slice(0, 3), [seasonAnimes]);

  // Encontrar nome do gênero selecionado
  const selectedGenreName = useMemo(() => {
    if (!selectedGenre) return 'Gênero';
    const genre = displayGenres.find(g => g.id === selectedGenre);
    return genre?.name || 'Gênero';
  }, [selectedGenre, displayGenres]);

  // Helper para obter URL da imagem do anime
  const getAnimeImage = (anime: CatalogAnime) => {
    return anime.local_image_url || anime.image_url || '/placeholder.svg';
  };

  // Helper para obter sinopse do anime (prioriza PT-BR)
  const getAnimeSynopsis = (anime: CatalogAnime) => {
    return anime.synopsis_pt || anime.synopsis || 'Sem sinopse disponível';
  };

  return (
    <div className="relative space-y-8 pt-12 md:pt-0 pb-8 min-h-screen">
      {/* Backgrounds orientais */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <SakuraPetals petalCount={15} opacity={0.5} colors={['hsl(350, 100%, 85%)', 'hsl(var(--primary))']} />
      </div>
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <WavePattern opacity={0.08} />
      </div>

      {/* Header */}
      <AnimatedContent direction="down" duration={0.5}>
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-zen text-3xl md:text-4xl font-bold mb-2">
            Descubra Novos <NeonText color="primary">Animes</NeonText>
          </h1>
          <p className="text-muted-foreground">
            Explore animes do catálogo e adicione à sua lista
          </p>
        </div>
      </AnimatedContent>

      {/* Barra de pesquisa */}
      <AnimatedContent direction="up" delay={0.1}>
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-12 h-14 text-lg bg-secondary/50 border-border/50 rounded-xl"
            />
            {loadingSearch && debouncedQuery && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
            )}
          </div>
        </div>
      </AnimatedContent>

      {/* Filtros de gênero */}
      <AnimatedContent direction="up" delay={0.2}>
        <div className="flex flex-wrap justify-center gap-2">
          {displayGenres.map((genre) => (
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
      </AnimatedContent>

      {/* Resultados da pesquisa */}
      {isSearching && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="font-zen text-xl font-semibold">
                Resultados para "{debouncedQuery}"
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {searchAnimes.length} encontrados
            </span>
          </div>
          
          {loadingSearch ? (
            <LoadingSkeleton count={12} />
          ) : searchAnimes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchAnimes.map((anime) => (
                  <CatalogAnimeCard key={anime.mal_id} anime={anime} />
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
              <h2 className="font-zen text-xl font-semibold">
                {selectedGenreName}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {genreAnimes.length} animes
            </span>
          </div>
          
          {loadingGenre ? (
            <LoadingSkeleton count={12} />
          ) : genreAnimes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {genreAnimes.map((anime) => (
                  <CatalogAnimeCard key={anime.mal_id} anime={anime} />
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
                  <h2 className="font-zen text-xl font-semibold">Temporada Atual</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {seasonAnimes.length} animes
                </span>
              </div>
              
              {loadingSeason ? (
                <LoadingSkeleton count={12} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {seasonAnimes.map((anime) => (
                      <CatalogAnimeCard key={anime.mal_id} anime={anime} />
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
                  <h2 className="font-zen text-xl font-semibold">Top Animes de Todos os Tempos</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {topAnimes.length} animes
                </span>
              </div>
              
              {loadingTop ? (
                <LoadingSkeleton count={12} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {topAnimes.map((anime, index) => (
                      <CatalogAnimeCard 
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

          {/* Separador decorativo Torii antes dos destaques */}
          {activeTab === 'season' && highlightAnimes.length > 0 && <ToriiDivider variant="gradient" />}

          {/* Destaques da temporada */}
          {activeTab === 'season' && highlightAnimes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-warning" />
                <h2 className="font-zen text-xl font-semibold">Destaques</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highlightAnimes.map((anime, index) => (
                  <div
                    key={`highlight-${anime.mal_id}`}
                    className="glass-card p-4 flex gap-4 hover:border-primary/30 transition-colors cursor-pointer animate-slide-up"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      borderImage: 'linear-gradient(135deg, hsl(var(--sakura)/0.3), hsl(var(--kintsugi)/0.3)) 1'
                    }}
                    onClick={() => handleSelectAnime(anime)}
                  >
                    <img
                      src={getAnimeImage(anime)}
                      alt={anime.title}
                      className="w-20 h-28 object-cover rounded-lg"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-1">{anime.title_english || anime.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {getAnimeSynopsis(anime)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {anime.genres?.slice(0, 2).map((genre) => (
                          <Badge key={genre.mal_id} variant="secondary" className="text-xs">
                            {genre.name}
                          </Badge>
                        ))}
                      </div>
                      {anime.score && (
                        <p className="text-xs text-primary mt-2 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-primary" />
                          Nota: {Number(anime.score).toFixed(1)}
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
          onOpenChange={handleCloseModal}
          catalogAnime={selectedAnime}
        />
      )}
    </div>
  );
}
