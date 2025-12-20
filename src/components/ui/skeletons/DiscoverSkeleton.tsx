import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página Descobrir
 * Exibe placeholders para busca e resultados
 */
export function DiscoverSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Barra de busca */}
      <div className="max-w-2xl mx-auto mb-8">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Seção de tendências */}
      <div className="mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <Skeleton className="aspect-[3/4] w-full rounded-lg mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid de resultados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
