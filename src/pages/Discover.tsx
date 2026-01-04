import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, TrendingUp, Sparkles, Filter, Tv, Loader2, Star, ChevronDown, AlertTriangle, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CatalogAnimeCard } from '@/components/anime/CatalogAnimeCard';
import { 
  useTopAnimes, 
  useSeasonAnimes, 
  useAnimeGenres,
  useCatalogStatus,
  POPULAR_GENRES
} from '@/hooks/useAnimeApi';
import { useAdvancedAnimeSearch, type DiscoverFilters, type DiscoverSort } from '@/hooks/useAdvancedAnimeFilters';
import { DiscoverFiltersSheet, ActiveFiltersBadges } from '@/components/anime/DiscoverFilters';
import { CatalogCoverageBadge } from '@/components/anime/CatalogCoverageIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';
import { SakuraPetals, WavePattern } from '@/components/backgrounds';
import { AnimatedContent, NeonText } from '@/components/animations';
import { ToriiDivider } from '@/components/decorative';
import { useAnimeEntriesContext } from '@/contexts/AnimeEntriesContext';
import type { CatalogAnime } from '@/types/catalog';

/**
 * Página de descoberta de animes com scroll infinito
 * Usa API própria do catálogo local (mais rápida e sem rate limit)
 */
export default function Discover() {
  // Estados de pesquisa e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'season' | 'top'>('season');
  const [selectedAnime, setSelectedAnime] = useState<CatalogAnime | null>(null);
  
  // Estados de filtros avançados - com persistência do hideInList
  const [advancedFilters, setAdvancedFilters] = useState<DiscoverFilters>(() => {
    const savedHideInList = localStorage.getItem('discover-hide-in-list');
    return { hideInList: savedHideInList === 'true' };
  });
  const [advancedSort, setAdvancedSort] = useState<DiscoverSort>({ field: 'score', order: 'desc' });
  
  // Ref para observar scroll infinito
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce da pesquisa
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sincroniza busca de texto com filtros avançados
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setAdvancedFilters(prev => ({ ...prev, search: debouncedQuery }));
    } else {
      setAdvancedFilters(prev => {
        const { search, ...rest } = prev;
        return rest;
      });
    }
  }, [debouncedQuery]);

  // Buscar gêneros disponíveis do catálogo
  const { data: catalogGenres } = useAnimeGenres();
  
  // Verificar status do catálogo (se está vazio ou populado)
  const { data: catalogStatus, isLoading: loadingStatus } = useCatalogStatus();

  // Hook para verificar se anime está na lista do usuário
  const { isInList } = useAnimeEntriesContext();

  // Verifica se há filtros ativos (excluindo hideInList da contagem para exibição)
  const hasActiveFilters = useMemo(() => Boolean(
    advancedFilters.search ||
    advancedFilters.genre ||
    advancedFilters.studio ||
    advancedFilters.yearMin ||
    advancedFilters.yearMax ||
    advancedFilters.type ||
    advancedFilters.status ||
    advancedFilters.scoreMin
  ), [advancedFilters]);

  // Hook de busca avançada
  const {
    data: advancedSearchData,
    fetchNextPage: fetchNextAdvanced,
    hasNextPage: hasNextAdvanced,
    isFetchingNextPage: isFetchingAdvanced,
    isLoading: loadingAdvanced
  } = useAdvancedAnimeSearch(advancedFilters, advancedSort);

  // Hooks de dados padrão com paginação infinita
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

  // Função para filtrar animes que já estão na lista do usuário
  const filterInList = useCallback((animes: CatalogAnime[]): CatalogAnime[] => {
    if (!advancedFilters.hideInList) return animes;
    return animes.filter((anime) => !isInList(anime.mal_id));
  }, [advancedFilters.hideInList, isInList]);

  // Flatten dos dados paginados, remoção de duplicatas e filtro de lista - MEMOIZADO
  const advancedAnimes = useMemo(() => 
    filterInList(removeDuplicates(advancedSearchData?.pages.flatMap(page => page.data) || [])),
    [advancedSearchData, removeDuplicates, filterInList]
  );

  const topAnimes = useMemo(() => 
    filterInList(removeDuplicates(topAnimesData?.pages.flatMap(page => page.data) || [])),
    [topAnimesData, removeDuplicates, filterInList]
  );
  
  const seasonAnimes = useMemo(() => 
    filterInList(removeDuplicates(seasonAnimesData?.pages.flatMap(page => page.data) || [])),
    [seasonAnimesData, removeDuplicates, filterInList]
  );

  // Determina qual função de carregar mais usar - MEMOIZADO
  const loadMoreConfig = useMemo(() => {
    if (hasActiveFilters) {
      return { fetch: fetchNextAdvanced, hasNext: hasNextAdvanced, isFetching: isFetchingAdvanced };
    }
    if (activeTab === 'top') {
      return { fetch: fetchNextTop, hasNext: hasNextTop, isFetching: isFetchingTop };
    }
    return { fetch: fetchNextSeason, hasNext: hasNextSeason, isFetching: isFetchingSeason };
  }, [
    hasActiveFilters, activeTab,
    fetchNextAdvanced, hasNextAdvanced, isFetchingAdvanced,
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

  // Gêneros para exibir nos filtros rápidos
  const displayGenres = useMemo(() => {
    if (catalogGenres && catalogGenres.length > 0) {
      return catalogGenres.slice(0, 8).map(g => ({ id: g.mal_id, name: g.name }));
    }
    return POPULAR_GENRES.slice(0, 8).map(g => ({ id: g.mal_id, name: g.name }));
  }, [catalogGenres]);

  // Funções de controle - MEMOIZADAS
  const handleGenreClick = useCallback((genreId: number) => {
    setAdvancedFilters(prev => ({
      ...prev,
      genre: prev.genre === genreId ? undefined : genreId
    }));
    // Limpa busca por texto ao selecionar gênero
    if (advancedFilters.genre !== genreId) {
      setSearchQuery('');
      setDebouncedQuery('');
    }
  }, [advancedFilters.genre]);

  const clearFilters = useCallback(() => {
    // Mantém a preferência de hideInList ao limpar filtros
    const savedHideInList = localStorage.getItem('discover-hide-in-list') === 'true';
    setAdvancedFilters({ hideInList: savedHideInList });
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  // Persiste a preferência de hideInList no localStorage
  const handleFiltersChange = useCallback((newFilters: DiscoverFilters) => {
    if (newFilters.hideInList !== undefined) {
      localStorage.setItem('discover-hide-in-list', String(newFilters.hideInList));
    }
    setAdvancedFilters(newFilters);
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

  // Encontrar nome do gênero selecionado
  const selectedGenreName = useMemo(() => {
    if (!advancedFilters.genre) return null;
    const genre = displayGenres.find(g => g.id === advancedFilters.genre);
    return genre?.name || null;
  }, [advancedFilters.genre, displayGenres]);

  // Verifica se o catálogo está vazio
  const isCatalogEmpty = catalogStatus && !catalogStatus.isPopulated;
  const catalogCount = catalogStatus?.totalAnimes || 0;

  // Título da seção baseado nos filtros
  const sectionTitle = useMemo(() => {
    if (advancedFilters.search) {
      return `Resultados para "${advancedFilters.search}"`;
    }
    if (selectedGenreName) {
      return `Animes de ${selectedGenreName}`;
    }
    if (hasActiveFilters) {
      return 'Resultados da Busca';
    }
    return null;
  }, [advancedFilters.search, selectedGenreName, hasActiveFilters]);

  return (
    <div className="relative space-y-6 pt-12 md:pt-0 pb-8 min-h-screen">
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
            Explore o catálogo com {catalogCount > 0 ? catalogCount.toLocaleString() : 'milhares de'} animes
          </p>
        </div>
      </AnimatedContent>

      {/* Indicador de cobertura */}
      <AnimatedContent direction="up" delay={0.05}>
        <div className="flex justify-center">
          <CatalogCoverageBadge />
        </div>
      </AnimatedContent>

      {/* Alerta de catálogo vazio */}
      {isCatalogEmpty && !loadingStatus && (
        <AnimatedContent direction="up" delay={0.1}>
          <Alert className="max-w-2xl mx-auto border-warning/50 bg-warning/10">
            <Database className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Catálogo em Sincronização</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              O catálogo de animes está sendo sincronizado. Em breve você poderá explorar milhares de títulos aqui.
            </AlertDescription>
          </Alert>
        </AnimatedContent>
      )}

      {/* Barra de pesquisa e filtros */}
      <AnimatedContent direction="up" delay={0.1}>
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex gap-2">
            {/* Campo de busca */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-12 h-12 text-base bg-secondary/50 border-border/50 rounded-xl"
              />
              {loadingAdvanced && debouncedQuery && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
              )}
            </div>
            
            {/* Botão de filtros avançados */}
            <DiscoverFiltersSheet
              filters={advancedFilters}
              sort={advancedSort}
              onFiltersChange={handleFiltersChange}
              onSortChange={setAdvancedSort}
              onClear={clearFilters}
            />
          </div>

          {/* Badges de filtros ativos */}
          <ActiveFiltersBadges 
            filters={advancedFilters} 
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </AnimatedContent>

      {/* Filtros rápidos de gênero */}
      <AnimatedContent direction="up" delay={0.2}>
        <div className="flex flex-wrap justify-center gap-2">
          {displayGenres.map((genre) => (
            <Badge
              key={genre.id}
              variant={advancedFilters.genre === genre.id ? "default" : "outline"}
              className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                advancedFilters.genre === genre.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-primary/10 hover:border-primary/50'
              }`}
              onClick={() => handleGenreClick(genre.id)}
            >
              {genre.name}
            </Badge>
          ))}
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className="px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive/20"
              onClick={clearFilters}
            >
              Limpar Filtros
            </Badge>
          )}
        </div>
      </AnimatedContent>

      {/* Resultados com filtros */}
      {hasActiveFilters && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="font-zen text-xl font-semibold">
                {sectionTitle}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {advancedAnimes.length} encontrados
            </span>
          </div>
          
          {loadingAdvanced ? (
            <LoadingSkeleton count={12} />
          ) : advancedAnimes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {advancedAnimes.map((anime) => (
                  <CatalogAnimeCard key={anime.mal_id} anime={anime} />
                ))}
              </div>
              <LoadMoreButton />
            </>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                Nenhum anime encontrado com esses filtros
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Limpar Filtros
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Seções padrão (quando não há filtros ativos) */}
      {!hasActiveFilters && (
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
        </>
      )}

      {/* Modal de detalhes */}
      <AnimeDetailModal
        catalogAnime={selectedAnime || undefined}
        open={!!selectedAnime}
        onOpenChange={handleCloseModal}
      />
    </div>
  );
}
