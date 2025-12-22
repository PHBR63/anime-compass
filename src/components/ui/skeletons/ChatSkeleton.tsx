import { Skeleton, SkeletonAvatar } from '@/components/ui/skeleton';
import { SakuraSpinner } from '@/components/ui/sakura-spinner';

/**
 * Skeleton da página de Chat
 * Exibe placeholders para lista de conversas e mensagens com animação sakura
 */
export function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-background flex animate-fade-in">
      {/* Lista de conversas */}
      <div className="w-80 border-r border-border/50 p-4 hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="sakura" className="h-6 w-32" />
          <Skeleton variant="pulse" className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton variant="shimmer" className="h-10 w-full mb-4" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <SkeletonAvatar variant="sakura" />
              <div className="flex-1">
                <Skeleton variant="sakura" className="h-4 w-32 mb-2" />
                <Skeleton variant="shimmer" className="h-3 w-48" />
              </div>
              <Skeleton variant="pulse" className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {/* Header do chat */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <SkeletonAvatar variant="sakura" />
          <div>
            <Skeleton variant="sakura" className="h-5 w-32 mb-1" />
            <Skeleton variant="shimmer" className="h-3 w-20" />
          </div>
        </div>

        {/* Mensagens com spinner central */}
        <div className="flex-1 p-4 flex items-center justify-center">
          <SakuraSpinner size="lg" text="Carregando mensagens..." />
        </div>

        {/* Input de mensagem */}
        <div className="p-4 border-t border-border/50 flex gap-2">
          <Skeleton variant="shimmer" className="h-10 flex-1 rounded-xl" />
          <Skeleton variant="pulse" className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
