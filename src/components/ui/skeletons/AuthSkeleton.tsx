import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de Autenticação
 * Exibe placeholder para formulário de login/registro
 */
export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Skeleton className="w-16 h-16 rounded-xl mx-auto mb-4" />
          <Skeleton className="h-8 w-40 mx-auto mb-2" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>

        {/* Card de formulário */}
        <div className="p-8 rounded-2xl border border-border/50 bg-card/50">
          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>

          {/* Campos do formulário */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-4 my-6">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-px flex-1" />
          </div>

          {/* Botões sociais */}
          <div className="space-y-2">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
