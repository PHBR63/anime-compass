import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MoreVertical, 
  ArrowLeft, 
  Users, 
  Info,
  X,
  ChevronUp,
  Loader2,
  Bell,
  BellOff,
  Settings,
  Reply
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConversationWithDetails } from '@/hooks/useConversations';
import { ChatMessageWithSender, useDeleteMessage, useLoadMoreMessages } from '@/hooks/useChatMessages';
import { useChatPresence } from '@/hooks/useChatPresence';
import { useChatNotification } from '@/hooks/useChatNotification';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useReadReceipts, isMessageRead, getReadByDetails } from '@/hooks/useReadReceipts';
import { useAuth } from '@/hooks/useAuth';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import GroupSettingsDrawer from './GroupSettingsDrawer';
import NotificationSettingsModal from './NotificationSettingsModal';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversation: ConversationWithDetails | null;
  messages: ChatMessageWithSender[];
  isLoading?: boolean;
  onBack?: () => void;
  onSendMessage: (content: string, replyTo?: string) => void;
  onSendAnime: (anime: any) => void;
  onSendRecommendation: (anime: any, message?: string) => void;
  onSendList?: (list: any, message?: string) => void;
}

// Componente principal da janela de chat
export default function ChatWindow({
  conversation,
  messages,
  isLoading,
  onBack,
  onSendMessage,
  onSendAnime,
  onSendRecommendation,
  onSendList,
}: ChatWindowProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessageWithSender | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [selectedMalId, setSelectedMalId] = useState<number | null>(null); // Estado para modal de anime
  const prevMessagesLength = useRef(messages.length);
  
  const deleteMessage = useDeleteMessage();
  const loadMoreMessages = useLoadMoreMessages(conversation?.id || null);
  
  // Hook de presença para status online e digitando
  const { isUserOnline, getTypingUsers, setTyping } = useChatPresence(conversation?.id || null);
  
  // Hook de notificação de som
  const { playNotification } = useChatNotification();

  // Hook de notificações push do navegador
  const { isEnabled: pushEnabled, isSupported, permission, requestPermission, notifyNewMessage } = usePushNotifications();

  // Hook de confirmação de leitura
  const { data: readReceipts } = useReadReceipts(conversation?.id || null);
  const typingUsers = getTypingUsers();

  // Solicitar permissão para notificações
  const handleRequestNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Notificações ativadas!');
    } else {
      toast.error('Permissão de notificações negada');
    }
  };

  // Texto do indicador de digitando
  const getTypingUsersText = () => {
    if (typingUsers.length === 0) return null;
    
    const names = typingUsers.map(t => t.displayName);
    
    if (names.length === 1) return `${names[0]} está digitando...`;
    if (names.length === 2) return `${names.join(' e ')} estão digitando...`;
    return `${names.slice(0, 2).join(', ')} e outros estão digitando...`;
  };

  const typingText = getTypingUsersText();

  // Scroll para última mensagem ao entrar na conversa
  useEffect(() => {
    if (scrollRef.current && messages.length > 0 && !isLoading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.id, isLoading]); // Executa quando muda de conversa ou termina de carregar

  // Auto-scroll para última mensagem quando novas mensagens chegam
  useEffect(() => {
    // Verificar se chegou nova mensagem
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      
      // Se a mensagem não é do usuário atual, tocar notificação
      if (lastMessage && lastMessage.sender_id !== user?.id) {
        const convType = conversation?.type as 'direct' | 'group' | undefined;
        playNotification(convType, lastMessage.message_type);
        
        // Enviar notificação push se habilitado
        const senderName = lastMessage.sender.display_name || lastMessage.sender.username || 'Alguém';
        const messageContent = lastMessage.message_type === 'anime_card' 
          ? '📺 Enviou um card de anime'
          : lastMessage.message_type === 'recommendation'
          ? '🎬 Enviou uma indicação'
          : lastMessage.content || 'Nova mensagem';
        
        notifyNewMessage(senderName, messageContent, conversation?.id);
      }
      
      // Scroll para baixo sempre que chegar nova mensagem
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    
    prevMessagesLength.current = messages.length;
  }, [messages, user?.id, playNotification, notifyNewMessage, conversation?.id, conversation?.type]);

  // Carregar mais mensagens antigas
  const handleLoadMore = async () => {
    if (!messages.length || loadMoreMessages.isPending) return;
    
    const oldestMessage = messages[0];
    const result = await loadMoreMessages.mutateAsync(oldestMessage.created_at);
    
    // Se retornou menos que 50 mensagens, não há mais
    if (result.length < 50) {
      setHasMoreMessages(false);
    }
  };

  // Se não há conversa selecionada
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            Selecione uma conversa
          </h3>
          <p className="text-sm text-muted-foreground/70">
            Ou inicie uma nova conversa com um amigo
          </p>
        </div>
      </div>
    );
  }

  // Nome e avatar da conversa
  const conversationName = conversation.type === 'group' 
    ? conversation.name || 'Grupo sem nome'
    : conversation.other_participant?.display_name || conversation.other_participant?.username || 'Usuário';

  const conversationAvatar = conversation.type === 'group'
    ? conversation.avatar_url
    : conversation.other_participant?.avatar_url;

  const getInitials = () => {
    return conversationName.substring(0, 2).toUpperCase();
  };

  // Verificar se o outro usuário está online (para chats diretos)
  const otherUserOnline = conversation.type === 'direct' && 
    conversation.other_participant && 
    isUserOnline(conversation.other_participant.user_id);

  // Agrupar mensagens por data
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toLocaleDateString('pt-BR');
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessageWithSender[]>);

  // Verificar se é admin do grupo
  const isAdmin = conversation.type === 'group' && 
    conversation.participants.find(p => p.user_id === user?.id)?.role === 'admin';

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage.mutate({ messageId, conversationId: conversation.id });
  };

  const handleReply = (message: ChatMessageWithSender) => {
    setReplyingTo(message);
  };

  const handleSendWithReply = (content: string) => {
    onSendMessage(content, replyingTo?.id);
    setReplyingTo(null);
  };

  // Callback para indicar digitando
  const handleTypingChange = (isTyping: boolean) => {
    setTyping(isTyping);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        {/* Botão voltar (mobile) */}
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversationAvatar || undefined} />
            <AvatarFallback className={conversation.type === 'group' ? 'bg-primary/20' : ''}>
              {conversation.type === 'group' ? <Users className="h-4 w-4" /> : getInitials()}
            </AvatarFallback>
          </Avatar>
          {/* Indicador online */}
          {otherUserOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{conversationName}</h3>
          <p className="text-xs text-muted-foreground">
            {typingText ? (
              <span className="text-primary animate-pulse">{typingText}</span>
            ) : conversation.type === 'group' ? (
              `${conversation.participants.length} membros`
            ) : otherUserOnline ? (
              <span className="text-green-500">Online</span>
            ) : (
              'Offline'
            )}
          </p>
        </div>

        {/* Menu de opções */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Configurações de notificações */}
            <DropdownMenuItem onClick={() => setShowNotificationSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações de notificações
            </DropdownMenuItem>
            
            {/* Opção de notificações push rápida */}
            {isSupported && (
              <DropdownMenuItem onClick={handleRequestNotifications}>
                {pushEnabled ? (
                  <>
                    <Bell className="h-4 w-4 mr-2 text-green-500" />
                    Push ativado
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2 text-destructive" />
                    Push bloqueado
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Ativar push
                  </>
                )}
              </DropdownMenuItem>
            )}
            
            {conversation.type === 'group' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowGroupSettings(true)}>
                  <Info className="h-4 w-4 mr-2" />
                  Configurações do grupo
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Área de mensagens */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm">Envie uma mensagem para iniciar a conversa!</p>
          </div>
        ) : (
          <>
            {/* Botão carregar mais mensagens antigas */}
            {hasMoreMessages && messages.length >= 50 && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadMoreMessages.isPending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {loadMoreMessages.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Carregar mensagens anteriores
                    </>
                  )}
                </Button>
              </div>
            )}

            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Separador de data */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground px-2">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Mensagens do dia */}
              {dateMessages.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar = !isOwn && (
                  index === 0 || 
                  dateMessages[index - 1]?.sender_id !== message.sender_id
                );
                
                // Verificar se a mensagem foi lida (somente para mensagens próprias)
                const messageIsRead = isOwn && readReceipts 
                  ? isMessageRead(message.created_at, readReceipts) 
                  : false;
                
                // Obter detalhes de quem leu (para o tooltip)
                const readByDetails = isOwn && readReceipts
                  ? getReadByDetails(message.created_at, readReceipts)
                  : [];

                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    showSenderName={conversation.type === 'group' && !isOwn && showAvatar}
                    onDelete={isOwn ? () => handleDeleteMessage(message.id) : undefined}
                    onReply={() => handleReply(message)}
                    onAnimeClick={(malId) => setSelectedMalId(malId)}
                    isRead={messageIsRead}
                    readByDetails={readByDetails}
                  />
                );
              })}
            </div>
          ))}

          {/* Indicador de digitação com animação e avatares */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-3">
              {/* Avatares dos usuários digitando */}
              <div className="flex -space-x-2">
                {typingUsers.slice(0, 3).map((typingUser) => (
                  <Avatar key={typingUser.userId} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={typingUser.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {typingUser.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              
              {/* Balão com bolinhas animadas */}
              <div className="flex items-center gap-1 bg-muted rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </ScrollArea>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
          <Reply className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Respondendo a {replyingTo.sender.display_name || replyingTo.sender.username}
            </p>
            <p className="text-sm truncate">
              {replyingTo.message_type === 'anime_card' 
                ? '📺 Card de anime'
                : replyingTo.content || 'Mensagem'
              }
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input de mensagem */}
      <ChatInput
        onSendMessage={replyingTo ? handleSendWithReply : onSendMessage}
        onSendAnime={onSendAnime}
        onSendRecommendation={onSendRecommendation}
        onSendList={onSendList}
        conversationId={conversation.id}
        recipientId={conversation.type === 'direct' ? conversation.other_participant?.user_id : undefined}
        onTypingChange={handleTypingChange}
      />

      {/* Drawer de configurações do grupo */}
      {conversation.type === 'group' && (
        <GroupSettingsDrawer
          open={showGroupSettings}
          onOpenChange={setShowGroupSettings}
          conversation={conversation}
          isAdmin={isAdmin}
        />
      )}

      {/* Modal de configurações de notificações */}
      <NotificationSettingsModal
        open={showNotificationSettings}
        onOpenChange={setShowNotificationSettings}
      />

      {/* Modal de detalhes do anime */}
      <AnimeDetailModal
        open={!!selectedMalId}
        onOpenChange={(open) => !open && setSelectedMalId(null)}
        malId={selectedMalId || 0}
      />
    </div>
  );
}
