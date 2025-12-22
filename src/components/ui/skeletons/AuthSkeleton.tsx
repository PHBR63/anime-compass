import { Skeleton } from '@/components/ui/skeleton';
import { SakuraSpinner } from '@/components/ui/sakura-spinner';

/**
 * Skeleton da página de Autenticação
 * Exibe placeholder para formulário de login/registro com animação sakura
 */
export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo com spinner */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SakuraSpinner size="lg" />
          </div>
          <Skeleton variant="sakura" className="h-8 w-40 mx-auto mb-2" />
          <Skeleton variant="shimmer" className="h-4 w-56 mx-auto" />
        </div>

        {/* Card de formulário */}
        <div className="p-8 rounded-2xl border border-border/50 bg-card/50">
          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <Skeleton variant="pulse" className="h-10 flex-1 rounded-lg" />
            <Skeleton variant="pulse" className="h-10 flex-1 rounded-lg" style={{ animationDelay: '100ms' }} />
          </div>

          {/* Campos do formulário */}
          <div className="space-y-4">
            <div>
              <Skeleton variant="sakura" className="h-4 w-20 mb-2" />
              <Skeleton variant="shimmer" className="h-11 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton variant="sakura" className="h-4 w-16 mb-2" style={{ animationDelay: '100ms' }} />
              <Skeleton variant="shimmer" className="h-11 w-full rounded-lg" style={{ animationDelay: '100ms' }} />
            </div>
            <Skeleton variant="sakura" className="h-4 w-32" style={{ animationDelay: '200ms' }} />
            <Skeleton variant="wave" className="h-11 w-full rounded-lg" style={{ animationDelay: '200ms' }} />
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-4 my-6">
            <Skeleton variant="shimmer" className="h-px flex-1" />
            <Skeleton variant="sakura" className="h-4 w-8" />
            <Skeleton variant="shimmer" className="h-px flex-1" />
          </div>

          {/* Botões sociais */}
          <div className="space-y-2">
            <Skeleton variant="pulse" className="h-11 w-full rounded-lg" />
            <Skeleton variant="pulse" className="h-11 w-full rounded-lg" style={{ animationDelay: '100ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
