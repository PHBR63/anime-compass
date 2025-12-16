import { Users, UserMinus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriends, useRemoveFriend } from '@/hooks/useFriendships';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Componente para exibir lista de amigos
export function FriendsList() {
  const { data: friends, isLoading } = useFriends();
  const removeFriend = useRemoveFriend();

  // Remover amigo
  const handleRemoveFriend = (friendshipId: string, friendName: string) => {
    removeFriend.mutate(friendshipId, {
      onSuccess: () => {
        toast.info(`${friendName} foi removido da sua lista de amigos`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Amigos
        </h2>
        <span className="text-sm text-muted-foreground">
          {friends?.length || 0}
        </span>
      </div>

      {friends?.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Você ainda não tem amigos. Encontre novos amigos para acompanhar suas atividades!
        </p>
      ) : (
        <div className="space-y-3">
          {friends?.map((friendship, index) => (
            <div
              key={friendship.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Avatar>
                <AvatarImage src={friendship.friend.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {(friendship.friend.display_name || friendship.friend.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {friendship.friend.display_name || friendship.friend.username || 'Usuário'}
                </p>
                {friendship.friend.username && (
                  <p className="text-xs text-muted-foreground">
                    @{friendship.friend.username}
                  </p>
                )}
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-border/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover amigo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja remover {friendship.friend.display_name || friendship.friend.username || 'este usuário'} da sua lista de amigos?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveFriend(
                        friendship.id, 
                        friendship.friend.display_name || friendship.friend.username || 'Usuário'
                      )}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
