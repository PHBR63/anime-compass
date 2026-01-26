import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Users, MessageCircle, Trash2, LogOut, MoreVertical, Pin, PinOff } from 'lucide-react';
import { ConversationWithDetails, useDeleteConversation } from '@/hooks/useConversations';
import { useGlobalPresence } from '@/hooks/useChatPresence';
import { useConversationsTyping } from '@/hooks/useConversationsTyping';
import { usePinConversation } from '@/hooks/usePinConversation';
import { formatCompactTime } from '@/lib/dateUtils';
import CreateGroupModal from './CreateGroupModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
}

// Componente para listar conversas do usuário
export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  isLoading,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; isGroup: boolean; isAdmin: boolean } | null>(null);
  const { isUserOnline } = useGlobalPresence();
  const { user } = useAuth();
  const deleteConversation = useDeleteConversation();
  const pinConversation = usePinConversation();
  
  // IDs das conversas para rastrear digitação
  const conversationIds = useMemo(() => conversations.map(c => c.id), [conversations]);
  const { getTypingUsers } = useConversationsTyping(conversationIds);

  // Filtrar conversas pela busca (com debounce simulado via useMemo)
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    
    const searchLower = search.toLowerCase();
    return conversations.filter(conv => {
      if (conv.type === 'direct') {
        const otherName = conv.other_participant?.display_name || conv.other_participant?.username || '';
        return otherName.toLowerCase().includes(searchLower);
      }
      return conv.name?.toLowerCase().includes(searchLower);
    });
  }, [conversations, search]);

  // Obter nome de exibição da conversa
  const getConversationName = (conv: ConversationWithDetails) => {
    if (conv.type === 'group') return conv.name || 'Grupo sem nome';
    return conv.other_participant?.display_name || conv.other_participant?.username || 'Usuário';
  };

  // Obter avatar da conversa
  const getConversationAvatar = (conv: ConversationWithDetails) => {
    if (conv.type === 'group') return conv.avatar_url;
    return conv.other_participant?.avatar_url;
  };

  // Obter iniciais para avatar fallback
  const getInitials = (conv: ConversationWithDetails) => {
    const name = getConversationName(conv);
    return name.substring(0, 2).toUpperCase();
  };

  // Verificar se o outro usuário está online (para chats diretos)
  const isOtherUserOnline = (conv: ConversationWithDetails) => {
    if (conv.type !== 'direct' || !conv.other_participant) return false;
    return isUserOnline(conv.other_participant.user_id);
  };

  // Formatar preview da última mensagem ou indicador de digitando
  const getLastMessagePreview = (conv: ConversationWithDetails) => {
    // Verificar se alguém está digitando
    const typingUsers = getTypingUsers(conv.id);
    if (typingUsers.length > 0) {
      if (typingUsers.length === 1) {
        return conv.type === 'group' 
          ? `${typingUsers[0].displayName} está digitando...`
          : 'digitando...';
      }
      return `${typingUsers.length} pessoas digitando...`;
    }

    if (!conv.last_message) return 'Nenhuma mensagem ainda';
    
    const prefix = conv.type === 'group' ? `${conv.last_message.sender_name}: ` : '';
    
    switch (conv.last_message.message_type) {
      case 'anime_card':
        return `${prefix}📺 Compartilhou um anime`;
      case 'recommendation':
        return `${prefix}⭐ Enviou uma indicação`;
      case 'image':
        return `${prefix}📷 Imagem`;
      case 'system':
        return conv.last_message.content || 'Mensagem do sistema';
      default:
        return `${prefix}${conv.last_message.content || ''}`;
    }
  };

  // Handler para fixar/desafixar conversa
  const handlePinConversation = async (conversationId: string, isPinned: boolean) => {
    try {
      await pinConversation.mutateAsync({ conversationId, isPinned: !isPinned });
      toast.success(isPinned ? 'Conversa desafixada' : 'Conversa fixada');
    } catch {
      toast.error('Erro ao atualizar conversa');
    }
  };

  // Verificar se o usuário é admin do grupo
  const isUserAdmin = (conv: ConversationWithDetails) => {
    if (conv.type !== 'group') return false;
    const userParticipation = conv.participants.find(p => p.user_id === user?.id);
    return userParticipation?.role === 'admin';
  };

  // Handler para deletar/sair da conversa
  const handleDeleteConversation = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteConversation.mutateAsync(deleteConfirm.id);
      toast.success(
        deleteConfirm.isGroup && deleteConfirm.isAdmin 
          ? 'Grupo deletado com sucesso' 
          : 'Você saiu da conversa'
      );
      // Se estava selecionado, limpar seleção
      if (selectedId === deleteConfirm.id) {
        onSelect('');
      }
    } catch {
      toast.error('Erro ao deletar conversa');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setShowCreateGroup(true)}
              title="Criar grupo"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onNewChat}
              title="Nova conversa"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={onNewChat}
            >
              Iniciar uma conversa
            </Button>
          </div>
        ) : (
          <div className="p-2">
        {filteredConversations.map((conv) => {
              const online = isOtherUserOnline(conv);
              const isAdmin = isUserAdmin(conv);
              const typingUsers = getTypingUsers(conv.id);
              const isTypingNow = typingUsers.length > 0;
              
              return (
                <div
                  key={conv.id}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-200 ease-out mb-1 group ${
                    selectedId === conv.id 
                      ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                      : 'hover:bg-muted/50 border border-transparent'
                  } ${conv.is_pinned ? 'bg-muted/30' : ''}`}
                >
                  {/* Área clicável principal */}
                  <button
                    onClick={() => onSelect(conv.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 transition-transform duration-150 active:scale-[0.98]"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={getConversationAvatar(conv) || undefined} />
                        <AvatarFallback className={conv.type === 'group' ? 'bg-primary/20' : ''}>
                          {conv.type === 'group' ? <Users className="h-5 w-5" /> : getInitials(conv)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Badge de não lidas */}
                      {conv.unread_count > 0 && (
                        <Badge 
                          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs animate-pulse bg-destructive text-destructive-foreground"
                        >
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </Badge>
                      )}
                      {/* Indicador online (para chats diretos) */}
                      {conv.type === 'direct' && online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                      )}
                    </div>

                    {/* Info da conversa */}
                    {/* Info da conversa */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 w-full">
                        {/* Nome e ícone de fixado - trunca primeiro */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 min-w-0 max-w-[65%] overflow-hidden">
                              {conv.is_pinned && (
                                <Pin className="h-3 w-3 text-primary shrink-0" />
                              )}
                              <span className={`font-medium truncate ${conv.unread_count > 0 ? 'text-foreground' : ''}`}>
                                {getConversationName(conv)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[250px]">
                            <p className="break-words">{getConversationName(conv)}</p>
                          </TooltipContent>
                        </Tooltip>
                        {/* Timestamp compacto - sempre visível */}
                        {conv.last_message && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-auto shrink-0">
                            {formatCompactTime(new Date(conv.last_message.created_at))}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs lg:text-sm truncate block ${
                        isTypingNow 
                          ? 'text-primary animate-pulse' 
                          : conv.unread_count > 0 
                            ? 'text-foreground font-medium' 
                            : 'text-muted-foreground'
                      }`}>
                        {getLastMessagePreview(conv)}
                      </p>
                    </div>
                  </button>

                  {/* Menu de opções */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Opção de fixar/desafixar */}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinConversation(conv.id, conv.is_pinned);
                        }}
                      >
                        {conv.is_pinned ? (
                          <>
                            <PinOff className="h-4 w-4 mr-2" />
                            Desafixar conversa
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4 mr-2" />
                            Fixar conversa
                          </>
                        )}
                      </DropdownMenuItem>
                      
                      {/* Opção de deletar/sair */}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ 
                            id: conv.id, 
                            isGroup: conv.type === 'group',
                            isAdmin 
                          });
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        {conv.type === 'group' && isAdmin ? (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar grupo
                          </>
                        ) : conv.type === 'group' ? (
                          <>
                            <LogOut className="h-4 w-4 mr-2" />
                            Sair do grupo
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Apagar conversa
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Modal de criar grupo */}
      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.isGroup && deleteConfirm?.isAdmin 
                ? 'Deletar grupo?' 
                : deleteConfirm?.isGroup 
                  ? 'Sair do grupo?' 
                  : 'Apagar conversa?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.isGroup && deleteConfirm?.isAdmin 
                ? 'Esta ação não pode ser desfeita. Todas as mensagens e participantes serão removidos.' 
                : deleteConfirm?.isGroup 
                  ? 'Você não poderá mais ver as mensagens deste grupo.'
                  : 'Esta ação não pode ser desfeita. Você perderá o acesso a esta conversa.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfirm?.isGroup && deleteConfirm?.isAdmin 
                ? 'Deletar' 
                : deleteConfirm?.isGroup 
                  ? 'Sair' 
                  : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
