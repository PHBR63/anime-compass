import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton genérico para páginas sem layout específico
 * Exibe um loader centralizado com texto
 */
export function GenericSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-primary/30 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <Skeleton className="h-5 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    </div>
  );
}
