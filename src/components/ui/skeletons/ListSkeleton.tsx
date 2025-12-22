import { Skeleton, SkeletonAnimeCard } from '@/components/ui/skeleton';
import { SakuraSpinner } from '@/components/ui/sakura-spinner';

/**
 * Skeleton da página Minha Lista
 * Exibe placeholders para grid de animes com animação sakura
 */
export function ListSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <SakuraSpinner size="sm" />
          <div>
            <Skeleton variant="sakura" className="h-8 w-40 mb-2" />
            <Skeleton variant="sakura" className="h-4 w-56" style={{ animationDelay: '100ms' }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton variant="shimmer" className="h-10 w-32" />
          <Skeleton variant="pulse" className="h-10 w-10" />
          <Skeleton variant="pulse" className="h-10 w-10" style={{ animationDelay: '100ms' }} />
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton 
            key={i} 
            variant="sakura" 
            className="h-9 w-24 flex-shrink-0 rounded-full" 
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>

      {/* Barra de busca */}
      <Skeleton variant="shimmer" className="h-10 w-full max-w-md mb-6" />

      {/* Grid de animes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <SkeletonAnimeCard 
            key={i} 
            variant="sakura" 
            style={{ animationDelay: `${i * 50}ms` }} 
          />
        ))}
      </div>
    </div>
  );
}
