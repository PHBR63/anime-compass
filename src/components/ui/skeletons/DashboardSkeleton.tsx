import { Skeleton, SkeletonStatCard } from '@/components/ui/skeleton';
import { SakuraSpinner } from '@/components/ui/sakura-spinner';

/**
 * Skeleton do Dashboard
 * Exibe placeholders para estatísticas e gráficos com animação sakura
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      {/* Header com spinner sakura */}
      <div className="mb-8 flex items-center gap-4">
        <SakuraSpinner size="sm" />
        <div>
          <Skeleton variant="sakura" className="h-8 w-48 mb-2" />
          <Skeleton variant="sakura" className="h-4 w-72" style={{ animationDelay: '100ms' }} />
        </div>
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <SkeletonStatCard key={i} variant="sakura" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <Skeleton variant="shimmer" className="h-5 w-40 mb-4" />
          <Skeleton variant="wave" className="h-64 w-full rounded-lg" />
        </div>
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <Skeleton variant="shimmer" className="h-5 w-40 mb-4" style={{ animationDelay: '150ms' }} />
          <Skeleton variant="wave" className="h-64 w-full rounded-lg" style={{ animationDelay: '150ms' }} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="p-6 rounded-xl border border-border/50 bg-card/50">
        <Skeleton variant="sakura" className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4" style={{ animationDelay: `${i * 80}ms` }}>
              <Skeleton variant="pulse" className="h-12 w-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton variant="sakura" className="h-4 w-48 mb-2" />
                <Skeleton variant="sakura" className="h-3 w-32" />
              </div>
              <Skeleton variant="shimmer" className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
