import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users, MessageCircle } from 'lucide-react';
import { ConversationWithDetails } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CreateGroupModal from './CreateGroupModal';

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

  // Filtrar conversas pela busca
  const filteredConversations = conversations.filter(conv => {
    const searchLower = search.toLowerCase();
    if (conv.type === 'direct') {
      const otherName = conv.other_participant?.display_name || conv.other_participant?.username || '';
      return otherName.toLowerCase().includes(searchLower);
    }
    return conv.name?.toLowerCase().includes(searchLower);
  });

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

  // Formatar preview da última mensagem
  const getLastMessagePreview = (conv: ConversationWithDetails) => {
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

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
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
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors mb-1 ${
                  selectedId === conv.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted/50'
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getConversationAvatar(conv) || undefined} />
                    <AvatarFallback className={conv.type === 'group' ? 'bg-primary/20' : ''}>
                      {conv.type === 'group' ? <Users className="h-5 w-5" /> : getInitials(conv)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Badge de não lidas */}
                  {conv.unread_count > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </Badge>
                  )}
                </div>

                {/* Info da conversa */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium truncate ${conv.unread_count > 0 ? 'text-foreground' : ''}`}>
                      {getConversationName(conv)}
                    </span>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${
                    conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {getLastMessagePreview(conv)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Modal de criar grupo */}
      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
      />
    </div>
  );
}
