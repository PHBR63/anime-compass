import { Search, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { mockAnimes } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const genres = ['Ação', 'Aventura', 'Comédia', 'Drama', 'Fantasia', 'Romance', 'Suspense'];

export default function Discover() {
  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          Descubra Novos <span className="text-gradient">Animes</span>
        </h1>
        <p className="text-muted-foreground">
          Explore recomendações personalizadas e tendências
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, gênero ou estúdio..."
            className="pl-12 h-14 text-lg bg-secondary/50 border-border/50 rounded-xl"
          />
          <Button className="absolute right-2 top-1/2 -translate-y-1/2" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Genres */}
      <div className="flex flex-wrap justify-center gap-2">
        {genres.map((genre) => (
          <Badge
            key={genre}
            variant="outline"
            className="px-4 py-2 text-sm cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors"
          >
            {genre}
          </Badge>
        ))}
      </div>

      {/* Trending Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Em Alta</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {mockAnimes.map((anime, index) => (
            <div 
              key={anime.id}
              className="anime-card cursor-pointer animate-scale-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                <img
                  src={anime.imageUrl}
                  alt={anime.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                
                {/* Rank badge */}
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-bold">
                  #{index + 1}
                </div>
                
                {/* Score */}
                {anime.score && (
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-warning" />
                    {anime.score}
                  </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-medium text-sm line-clamp-2">
                    {anime.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {anime.episodes} eps • {anime.year}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold">Para Você</h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAnimes.slice(0, 3).map((anime, index) => (
            <div
              key={anime.id}
              className="glass-card p-4 flex gap-4 hover:border-primary/30 transition-colors cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <img
                src={anime.imageUrl}
                alt={anime.title}
                className="w-20 h-28 object-cover rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold line-clamp-1">{anime.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {anime.synopsis}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {anime.genres.slice(0, 2).map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-primary mt-2">
                  Baseado em: Gêneros similares
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
