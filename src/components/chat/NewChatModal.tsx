import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle } from 'lucide-react';
import { useFriends } from '@/hooks/useFriendships';
import { useCreateConversation } from '@/hooks/useConversations';
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
  
  const { data: friends, isLoading } = useFriends();
  const createConversation = useCreateConversation();

  // Filtrar amigos pela busca
  const filteredFriends = friends?.filter(f => {
    const searchLower = search.toLowerCase();
    const name = f.friend.display_name || f.friend.username || '';
    return name.toLowerCase().includes(searchLower);
  }) || [];

  // Iniciar conversa com amigo
  const handleStartChat = async (friendId: string) => {
    try {
      const conversation = await createConversation.mutateAsync({
        type: 'direct',
        participantIds: [friendId],
      });
      
      onConversationCreated(conversation.id);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao iniciar conversa');
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
        </DialogHeader>

        <div className="space-y-4">
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
                {filteredFriends.map(friendship => (
                  <button
                    key={friendship.friend.id}
                    onClick={() => handleStartChat(friendship.friend.id)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friendship.friend.avatar_url || undefined} />
                      <AvatarFallback>
                        {(friendship.friend.display_name || friendship.friend.username || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium truncate">
                        {friendship.friend.display_name || friendship.friend.username}
                      </p>
                      {friendship.friend.username && friendship.friend.display_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{friendship.friend.username}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
