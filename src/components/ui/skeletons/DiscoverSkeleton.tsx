import { Skeleton, SkeletonAnimeCard } from '@/components/ui/skeleton';
import { SakuraSpinner } from '@/components/ui/sakura-spinner';

/**
 * Skeleton da página Descobrir
 * Exibe placeholders para busca e resultados com animação sakura
 */
export function DiscoverSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <SakuraSpinner size="sm" />
        <div>
          <Skeleton variant="sakura" className="h-8 w-56 mb-2" />
          <Skeleton variant="sakura" className="h-4 w-80" style={{ animationDelay: '100ms' }} />
        </div>
      </div>

      {/* Barra de busca */}
      <div className="max-w-2xl mx-auto mb-8">
        <Skeleton variant="shimmer" className="h-12 w-full rounded-xl" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {[...Array(6)].map((_, i) => (
          <Skeleton 
            key={i} 
            variant="pulse" 
            className="h-8 w-20 rounded-full" 
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      {/* Seção de tendências */}
      <div className="mb-8">
        <Skeleton variant="sakura" className="h-6 w-40 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <Skeleton variant="wave" className="aspect-[3/4] w-full rounded-lg mb-2" style={{ animationDelay: `${i * 80}ms` }} />
              <Skeleton variant="sakura" className="h-4 w-full" style={{ animationDelay: `${i * 80 + 40}ms` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Grid de resultados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <SkeletonAnimeCard 
            key={i} 
            variant="sakura" 
            style={{ animationDelay: `${i * 40}ms` }} 
          />
        ))}
      </div>
    </div>
  );
}
