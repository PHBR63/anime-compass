import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Edit2, 
  UserPlus, 
  LogOut, 
  MoreVertical,
  Crown,
  UserMinus,
  Check,
  X
} from 'lucide-react';
import { ConversationWithDetails } from '@/hooks/useConversations';
import { 
  useUpdateGroup, 
  useLeaveGroup, 
  useRemoveGroupMember,
  usePromoteToAdmin 
} from '@/hooks/useGroupManagement';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriendships';
import { useAddGroupMember } from '@/hooks/useGroupManagement';

interface GroupSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationWithDetails;
  isAdmin: boolean;
}

// Drawer com configurações do grupo
export default function GroupSettingsDrawer({
  open,
  onOpenChange,
  conversation,
  isAdmin,
}: GroupSettingsDrawerProps) {
  const { user } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.name || '');
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: friends } = useFriends();
  const updateGroup = useUpdateGroup();
  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveGroupMember();
  const promoteMember = usePromoteToAdmin();
  const addMember = useAddGroupMember();

  // Amigos que não estão no grupo
  const availableFriends = friends?.filter(
    f => !conversation.participants.some(p => p.user_id === f.friend.id)
  ) || [];

  // Salvar nome do grupo
  const handleSaveName = async () => {
    if (newName.trim() && newName !== conversation.name) {
      await updateGroup.mutateAsync({
        conversationId: conversation.id,
        name: newName.trim(),
      });
    }
    setIsEditingName(false);
  };

  // Sair do grupo
  const handleLeaveGroup = async () => {
    await leaveGroup.mutateAsync(conversation.id);
    onOpenChange(false);
  };

  // Adicionar membro
  const handleAddMember = async (userId: string) => {
    await addMember.mutateAsync({
      conversationId: conversation.id,
      userId,
    });
    setShowAddMember(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configurações do Grupo</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-6">
            {/* Avatar e nome do grupo */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={conversation.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/20">
                  <Users className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>

              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="icon" onClick={handleSaveName}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{conversation.name || 'Grupo sem nome'}</h3>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setNewName(conversation.name || '');
                        setIsEditingName(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {conversation.participants.length} membros
              </p>
            </div>

            <Separator />

            {/* Lista de membros */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Membros</h4>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMember(!showAddMember)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </div>

              {/* Adicionar membro */}
              {showAddMember && availableFriends.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Adicionar amigo ao grupo</p>
                  <div className="space-y-1">
                    {availableFriends.map(friendship => (
                      <button
                        key={friendship.friend.id}
                        onClick={() => handleAddMember(friendship.friend.id)}
                        className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friendship.friend.avatar_url || undefined} />
                          <AvatarFallback>
                            {(friendship.friend.display_name || 'U').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {friendship.friend.display_name || friendship.friend.username}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de membros atuais */}
              <div className="space-y-2">
                {conversation.participants.map(participant => (
                  <div
                    key={participant.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback>
                        {(participant.display_name || participant.username || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {participant.display_name || participant.username}
                        </span>
                        {participant.role === 'admin' && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                        {participant.user_id === user?.id && (
                          <span className="text-xs text-muted-foreground">(você)</span>
                        )}
                      </div>
                      {participant.username && (
                        <p className="text-xs text-muted-foreground">@{participant.username}</p>
                      )}
                    </div>

                    {/* Menu de ações (apenas para admin e não para si mesmo) */}
                    {isAdmin && participant.user_id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {participant.role !== 'admin' && (
                            <DropdownMenuItem
                              onClick={() => promoteMember.mutate({
                                conversationId: conversation.id,
                                userId: participant.user_id,
                              })}
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Tornar admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeMember.mutate({
                              conversationId: conversation.id,
                              userId: participant.user_id,
                            })}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remover do grupo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sair do grupo */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair do grupo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair do grupo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você não receberá mais mensagens deste grupo. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveGroup}>
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
