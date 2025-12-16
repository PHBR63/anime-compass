import { useState, useEffect } from 'react';
import { Search, TrendingUp, Sparkles, Filter, Tv, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JikanAnimeCard } from '@/components/anime/JikanAnimeCard';
import { useTopAnimes, useSeasonNow, useSearchAnimes, useAnimesByGenre, GENRES } from '@/hooks/useJikanApi';
import { Skeleton } from '@/components/ui/skeleton';

// Página de descoberta de animes usando a API Jikan (MyAnimeList)
export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  // Debounce da pesquisa para evitar muitas requisições
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Hooks de dados
  const { data: topAnimes, isLoading: loadingTop } = useTopAnimes();
  const { data: seasonAnimes, isLoading: loadingSeason } = useSeasonNow();
  const { data: searchResults, isLoading: loadingSearch, isFetching: fetchingSearch } = useSearchAnimes(debouncedQuery);
  const { data: genreAnimes, isLoading: loadingGenre } = useAnimesByGenre(selectedGenre || 0);

  // Verifica se está pesquisando
  const isSearching = debouncedQuery.length >= 2;
  const isFilteringByGenre = selectedGenre !== null;

  // Função para selecionar/deselecionar gênero
  const handleGenreClick = (genreId: number) => {
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
    } else {
      setSelectedGenre(genreId);
      setSearchQuery('');
      setDebouncedQuery('');
    }
  };

  // Limpar filtros
  const clearFilters = () => {
    setSelectedGenre(null);
    setSearchQuery('');
    setDebouncedQuery('');
  };

  // Componente de loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pt-12 md:pt-0">
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
          {(fetchingSearch || loadingSearch) && debouncedQuery && (
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
          <div className="flex items-center gap-2 mb-6">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">
              Resultados para "{debouncedQuery}"
            </h2>
          </div>
          
          {loadingSearch ? (
            <LoadingSkeleton />
          ) : searchResults?.data && searchResults.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {searchResults.data.map((anime, index) => (
                <JikanAnimeCard 
                  key={anime.mal_id} 
                  anime={anime}
                />
              ))}
            </div>
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
          <div className="flex items-center gap-2 mb-6">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">
              {GENRES.find(g => g.id === selectedGenre)?.name || 'Gênero'}
            </h2>
          </div>
          
          {loadingGenre ? (
            <LoadingSkeleton />
          ) : genreAnimes?.data && genreAnimes.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {genreAnimes.data.map((anime) => (
                <JikanAnimeCard key={anime.mal_id} anime={anime} />
              ))}
            </div>
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
          {/* Animes da temporada */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Tv className="h-5 w-5 text-accent" />
              <h2 className="font-display text-xl font-semibold">Temporada Atual</h2>
            </div>
            
            {loadingSeason ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {seasonAnimes?.data?.slice(0, 6).map((anime) => (
                  <JikanAnimeCard key={anime.mal_id} anime={anime} />
                ))}
              </div>
            )}
          </section>

          {/* Top Animes */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">Top Animes</h2>
            </div>
            
            {loadingTop ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {topAnimes?.data?.map((anime, index) => (
                  <JikanAnimeCard 
                    key={anime.mal_id} 
                    anime={anime} 
                    rank={index + 1}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Recomendações rápidas */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-warning" />
              <h2 className="font-display text-xl font-semibold">Destaques da Temporada</h2>
            </div>
            
            {loadingSeason ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasonAnimes?.data?.slice(6, 9).map((anime, index) => (
                  <div
                    key={anime.mal_id}
                    className="glass-card p-4 flex gap-4 hover:border-primary/30 transition-colors cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
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
            )}
          </section>
        </>
      )}
    </div>
  );
}

// Importação do ícone Star para os destaques
import { Star } from 'lucide-react';
