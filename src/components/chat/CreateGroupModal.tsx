import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, X } from 'lucide-react';
import { useFriends } from '@/hooks/useFriendships';
import { useCreateConversation } from '@/hooks/useConversations';
import { toast } from 'sonner';

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Modal para criar um novo grupo
export default function CreateGroupModal({
  open,
  onOpenChange,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  
  const { data: friends, isLoading } = useFriends();
  const createConversation = useCreateConversation();

  // Resetar ao fechar
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGroupName('');
      setSelectedFriends([]);
    }
    onOpenChange(open);
  };

  // Toggle seleção de amigo
  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Criar grupo
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Digite um nome para o grupo');
      return;
    }

    if (selectedFriends.length < 1) {
      toast.error('Selecione pelo menos 1 amigo');
      return;
    }

    try {
      await createConversation.mutateAsync({
        type: 'group',
        name: groupName.trim(),
        participantIds: selectedFriends,
      });
      
      toast.success('Grupo criado com sucesso!');
      handleOpenChange(false);
    } catch (error) {
      toast.error('Erro ao criar grupo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Criar Novo Grupo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome do grupo */}
          <div>
            <Label htmlFor="group-name">Nome do grupo</Label>
            <Input
              id="group-name"
              placeholder="Ex: Otakus Unidos"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Membros selecionados */}
          {selectedFriends.length > 0 && (
            <div>
              <Label>Membros selecionados ({selectedFriends.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedFriends.map(friendId => {
                  const friend = friends?.find(f => f.friend.id === friendId);
                  if (!friend) return null;

                  return (
                    <div
                      key={friendId}
                      className="flex items-center gap-1 bg-primary/10 text-primary rounded-full pl-1 pr-2 py-1 text-sm"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={friend.friend.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(friend.friend.display_name || friend.friend.username || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{friend.friend.display_name || friend.friend.username}</span>
                      <button
                        onClick={() => toggleFriend(friendId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de amigos */}
          <div>
            <Label>Selecionar amigos</Label>
            <ScrollArea className="h-[200px] border rounded-lg mt-2">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando...
                </div>
              ) : friends?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Você ainda não tem amigos adicionados
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {friends?.map(friendship => (
                    <label
                      key={friendship.friend.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friendship.friend.id)}
                        onCheckedChange={() => toggleFriend(friendship.friend.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friendship.friend.avatar_url || undefined} />
                        <AvatarFallback>
                          {(friendship.friend.display_name || friendship.friend.username || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {friendship.friend.display_name || friendship.friend.username}
                        </p>
                        {friendship.friend.username && friendship.friend.display_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            @{friendship.friend.username}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedFriends.length < 1 || createConversation.isPending}
          >
            {createConversation.isPending ? 'Criando...' : 'Criar Grupo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
