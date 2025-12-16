import { Check, X, Loader2, Clock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePendingRequests, useRespondToRequest } from '@/hooks/useFriendships';
import { toast } from 'sonner';

// Componente para exibir pedidos de amizade pendentes
export function PendingRequests() {
  const { data, isLoading } = usePendingRequests();
  const respondToRequest = useRespondToRequest();

  // Aceitar pedido
  const handleAccept = (friendshipId: string, userName: string) => {
    respondToRequest.mutate({ friendshipId, accept: true }, {
      onSuccess: () => {
        toast.success(`Você e ${userName} agora são amigos!`);
      },
    });
  };

  // Recusar pedido
  const handleReject = (friendshipId: string) => {
    respondToRequest.mutate({ friendshipId, accept: false }, {
      onSuccess: () => {
        toast.info('Pedido recusado');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const totalPending = (data?.received.length || 0) + (data?.sent.length || 0);

  if (totalPending === 0) return null;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Pedidos de Amizade
        </h2>
        <Badge variant="secondary">{totalPending}</Badge>
      </div>

      <div className="space-y-3">
        {/* Pedidos recebidos */}
        {data?.received.map((request, index) => (
          <div
            key={request.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Avatar>
              <AvatarImage src={request.friend?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {(request.friend?.display_name || request.friend?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {request.friend?.display_name || request.friend?.username || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground">Quer ser seu amigo</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAccept(request.id, request.friend?.display_name || 'Usuário')}
                disabled={respondToRequest.isPending}
              >
                {respondToRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleReject(request.id)}
                disabled={respondToRequest.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Pedidos enviados */}
        {data?.sent.map((request, index) => (
          <div
            key={request.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 opacity-70 animate-slide-up"
            style={{ animationDelay: `${(data?.received.length || 0 + index) * 50}ms` }}
          >
            <Avatar>
              <AvatarImage src={request.friend?.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {(request.friend?.display_name || request.friend?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {request.friend?.display_name || request.friend?.username || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Aguardando resposta
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
