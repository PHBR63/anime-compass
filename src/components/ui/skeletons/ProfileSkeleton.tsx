import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de Perfil
 * Exibe placeholders para banner, avatar e stats
 */
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Banner */}
      <Skeleton className="h-48 w-full" />

      {/* Avatar e info */}
      <div className="px-6 -mt-16 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
          <div className="flex-1 pb-4">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-card/50 text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border/50 pb-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-border/50 bg-card/50">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
          <div className="p-6 rounded-xl border border-border/50 bg-card/50">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
