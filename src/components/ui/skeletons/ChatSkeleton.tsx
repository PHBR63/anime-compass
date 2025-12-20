import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de Chat
 * Exibe placeholders para lista de conversas e mensagens
 */
export function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-background flex animate-fade-in">
      {/* Lista de conversas */}
      <div className="w-80 border-r border-border/50 p-4 hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {/* Header do chat */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[70%] ${i % 2 === 0 ? '' : 'items-end'}`}>
                <Skeleton 
                  className={`h-16 rounded-2xl ${
                    i % 2 === 0 ? 'w-64' : 'w-48'
                  }`} 
                />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Input de mensagem */}
        <div className="p-4 border-t border-border/50 flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
