import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página Minha Lista
 * Exibe placeholders para grid de animes
 */
export function ListSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 flex-shrink-0 rounded-full" />
        ))}
      </div>

      {/* Barra de busca */}
      <Skeleton className="h-10 w-full max-w-md mb-6" />

      {/* Grid de animes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
