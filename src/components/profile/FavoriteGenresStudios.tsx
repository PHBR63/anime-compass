import { Palette, Building2, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useFavoriteGenresStudios } from '@/hooks/useFavoriteGenresStudios';
import { AnimatedContent } from '@/components/animations';

/**
 * Componente que exibe gêneros e estúdios favoritos do usuário
 * Baseado no histórico de animes assistidos
 */
export function FavoriteGenresStudios() {
  const { data, isLoading } = useFavoriteGenresStudios();

  // Não renderiza se não houver dados
  if (!isLoading && (!data || (data.genres.length === 0 && data.studios.length === 0))) {
    return null;
  }

  return (
    <AnimatedContent direction="up" delay={0.6} duration={0.5}>
      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          Preferências
        </h2>

        <div className="space-y-6">
          {/* Gêneros Favoritos */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
              <Palette className="h-4 w-4" />
              Gêneros Favoritos
            </h3>
            
            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
            ) : data?.genres.length ? (
              <div className="flex flex-wrap gap-2">
                {data.genres.map((genre, index) => (
                  <Badge
                    key={genre.id}
                    variant={index === 0 ? 'default' : 'secondary'}
                    className={`
                      transition-all duration-200 hover:scale-105
                      ${index === 0 ? 'bg-primary/90 hover:bg-primary' : ''}
                    `}
                  >
                    {genre.name}
                    <span className="ml-1.5 text-xs opacity-70">({genre.count})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Adicione animes à sua lista para ver seus gêneros favoritos
              </p>
            )}
          </div>

          {/* Estúdios Favoritos */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4" />
              Estúdios Favoritos
            </h3>
            
            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            ) : data?.studios.length ? (
              <div className="flex flex-wrap gap-2">
                {data.studios.map((studio, index) => (
                  <Badge
                    key={studio.id}
                    variant={index === 0 ? 'default' : 'outline'}
                    className={`
                      transition-all duration-200 hover:scale-105
                      ${index === 0 ? 'bg-accent text-accent-foreground' : ''}
                    `}
                  >
                    {studio.name}
                    <span className="ml-1.5 text-xs opacity-70">({studio.count})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Adicione animes à sua lista para ver seus estúdios favoritos
              </p>
            )}
          </div>
        </div>
      </div>
    </AnimatedContent>
  );
}
