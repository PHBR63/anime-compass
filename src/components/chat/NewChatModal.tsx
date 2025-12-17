import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useFriends } from '@/hooks/useFriendships';
import { useCreateConversation } from '@/hooks/useConversations';
import { useGlobalPresence } from '@/hooks/useChatPresence';
import { toast } from 'sonner';

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

// Modal para iniciar nova conversa direta
export default function NewChatModal({
  open,
  onOpenChange,
  onConversationCreated,
}: NewChatModalProps) {
  const [search, setSearch] = useState('');
  const [lastError, setLastError] = useState<{ friendId: string; message: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { data: friends, isLoading } = useFriends();
  const createConversation = useCreateConversation();
  const { isUserOnline } = useGlobalPresence();

  // Filtrar amigos pela busca
  const filteredFriends = friends?.filter(f => {
    const searchLower = search.toLowerCase();
    const name = f.friend.display_name || f.friend.username || '';
    return name.toLowerCase().includes(searchLower);
  }) || [];

  // Iniciar conversa com amigo
  const handleStartChat = async (friendId: string) => {
    setLastError(null);
    try {
      const conversation = await createConversation.mutateAsync({
        type: 'direct',
        participantIds: [friendId],
      });
      
      onConversationCreated(conversation.id);
      onOpenChange(false);
    } catch (error: any) {
      // Extrair mensagem de erro detalhada
      const errorMessage = error?.message || 
        error?.error?.message || 
        'Erro desconhecido ao criar conversa';
      
      setLastError({ friendId, message: errorMessage });
      toast.error('Erro ao iniciar conversa', {
        description: errorMessage,
      });
    }
  };

  // Tentar novamente
  const handleRetry = async () => {
    if (!lastError) return;
    
    setIsRetrying(true);
    try {
      await handleStartChat(lastError.friendId);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            Selecione um amigo para iniciar uma conversa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Erro com botão de retry */}
          {lastError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Erro ao criar conversa</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {lastError.message}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRetry}
                disabled={isRetrying}
                className="shrink-0"
              >
                {isRetrying ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Tentar
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar amigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lista de amigos */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? 'Nenhum amigo encontrado' : 'Você ainda não tem amigos adicionados'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFriends.map(friendship => {
                  const online = isUserOnline(friendship.friend.id);
                  return (
                    <button
                      key={friendship.friend.id}
                      onClick={() => handleStartChat(friendship.friend.id)}
                      disabled={createConversation.isPending}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friendship.friend.avatar_url || undefined} />
                          <AvatarFallback>
                            {(friendship.friend.display_name || friendship.friend.username || 'U').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Indicador online */}
                        {online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium truncate">
                          {friendship.friend.display_name || friendship.friend.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {online ? (
                            <span className="text-green-500">Online</span>
                          ) : (
                            friendship.friend.username && friendship.friend.display_name 
                              ? `@${friendship.friend.username}`
                              : 'Offline'
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
