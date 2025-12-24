import { useState } from 'react';
import { Search, UserPlus, Loader2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchUsers, useSendFriendRequest, usePendingRequests } from '@/hooks/useFriendships';
import { toast } from 'sonner';

/**
 * Modal para buscar e adicionar novos amigos
 */
export function FindFriendsModal() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: users, isLoading } = useSearchUsers(searchQuery);
  const { data: pendingRequests } = usePendingRequests();
  const sendRequest = useSendFriendRequest();

  // Verificar se já tem pedido pendente para um usuário
  const hasPendingRequest = (userId: string) => {
    return pendingRequests?.sent.some(r => r.addressee_id === userId) || false;
  };

  // Enviar pedido de amizade
  const handleSendRequest = (userId: string, userName: string) => {
    sendRequest.mutate(userId, {
      onSuccess: () => {
        toast.success(`Pedido enviado para ${userName}!`);
      },
      onError: (error: any) => {
        if (error.message?.includes('duplicate')) {
          toast.error('Você já enviou um pedido para este usuário');
        } else {
          toast.error('Erro ao enviar pedido');
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow">
          <UserPlus className="h-4 w-4" />
          Encontrar Amigos
        </Button>
      </DialogTrigger>
      {/* Modal responsiva com altura adaptável */}
      <DialogContent className="w-[95vw] max-w-md h-[85vh] max-h-[600px] flex flex-col p-0 gap-0 glass-card border-border/50">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 flex-shrink-0">
          <DialogTitle className="font-display">Encontrar Amigos</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6">
          {/* Campo de busca */}
          <div className="relative mb-4 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>

          {/* Resultados com scroll */}
          <ScrollArea className="flex-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="space-y-2 pb-4">
              {isLoading && searchQuery.length >= 2 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!isLoading && searchQuery.length >= 2 && users?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado
                </p>
              )}

              {searchQuery.length < 2 && (
                <p className="text-center text-muted-foreground py-8">
                  Digite pelo menos 2 caracteres para buscar
                </p>
              )}

              {users?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.display_name || user.username || 'Usuário'}
                    </p>
                    {user.username && (
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    )}
                  </div>

                  {hasPendingRequest(user.id) ? (
                    <Button variant="secondary" size="sm" disabled className="gap-1 flex-shrink-0">
                      <Clock className="h-4 w-4" />
                      <span className="hidden sm:inline">Pendente</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendRequest(user.id, user.display_name || user.username || 'Usuário')}
                      disabled={sendRequest.isPending}
                      className="gap-1 flex-shrink-0"
                    >
                      {sendRequest.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
