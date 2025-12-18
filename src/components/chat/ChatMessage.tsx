import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoreVertical, Trash2, Reply, Star, ExternalLink, SmilePlus, Check, CheckCheck, Globe, Lock, List } from 'lucide-react';
import { ChatMessageWithSender } from '@/hooks/useChatMessages';
import { useMessageReactions, useToggleReaction, REACTION_TYPES, ReactionType } from '@/hooks/useChatReactions';
import { ReadByDetail } from '@/hooks/useReadReceipts';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageWithSender;
  isOwn: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
  onDelete?: () => void;
  onReply: () => void;
  isRead?: boolean; // Se a mensagem foi lida pelo destinatário
  readByDetails?: ReadByDetail[]; // Detalhes de quem leu e quando
}

// Componente para renderizar uma mensagem do chat
export default function ChatMessage({
  message,
  isOwn,
  showAvatar,
  showSenderName,
  onDelete,
  onReply,
  isRead = false,
  readByDetails = [],
}: ChatMessageProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const { data: reactions } = useMessageReactions(message.id);
  const { user } = useAuth();
  const toggleReaction = useToggleReaction();
  const navigate = useNavigate();

  // Formatar hora da mensagem
  const time = format(new Date(message.created_at), 'HH:mm', { locale: ptBR });

  // Toggle reação
  const handleReaction = (type: ReactionType) => {
    toggleReaction.mutate({ messageId: message.id, reactionType: type });
    setShowReactionPicker(false);
  };

  // Renderizar conteúdo baseado no tipo
  const renderContent = () => {
    // Mensagem deletada
    if (message.is_deleted) {
      return (
        <p className="text-muted-foreground italic text-sm">
          Mensagem apagada
        </p>
      );
    }

    switch (message.message_type) {
      case 'anime_card':
        return renderAnimeCard();
      case 'recommendation':
        return renderRecommendation();
      case 'list_card':
        return renderListCard();
      case 'system':
        return renderSystemMessage();
      default:
        return renderTextMessage();
    }
  };

  // Mensagem de texto simples
  const renderTextMessage = () => (
    <div>
      {/* Mensagem respondida */}
      {message.replied_message && (
        <div className="mb-2 pl-3 border-l-2 border-primary/50 text-sm opacity-70">
          <p className="font-medium text-xs">{message.replied_message.sender_name}</p>
          <p className="truncate">{message.replied_message.content}</p>
        </div>
      )}
      <p className="whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  );

  // Card de anime compartilhado
  const renderAnimeCard = () => (
    <Card className="overflow-hidden max-w-xs">
      <div className="flex">
        {message.metadata.image_url && (
          <img
            src={message.metadata.image_url}
            alt={message.metadata.title}
            className="w-20 h-28 object-cover"
          />
        )}
        <CardContent className="p-3 flex-1">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">
            {message.metadata.title}
          </h4>
          {message.metadata.episodes && (
            <p className="text-xs text-muted-foreground">
              {message.metadata.episodes} episódios
            </p>
          )}
          {message.metadata.score && (
            <div className="flex items-center gap-1 text-xs mt-1">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>{message.metadata.score}</span>
            </div>
          )}
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto mt-2 text-xs"
            onClick={() => window.open(`https://myanimelist.net/anime/${message.metadata.mal_id}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Ver no MAL
          </Button>
        </CardContent>
      </div>
    </Card>
  );

  // Indicação de anime
  const renderRecommendation = () => (
    <Card className="overflow-hidden max-w-xs border-primary/30 bg-primary/5">
      <div className="p-2 bg-primary/10 border-b border-primary/20">
        <p className="text-xs font-medium flex items-center gap-1">
          <Star className="h-3 w-3 text-primary" />
          Indicação de Anime
        </p>
      </div>
      <div className="flex">
        {message.metadata.image_url && (
          <img
            src={message.metadata.image_url}
            alt={message.metadata.title}
            className="w-20 h-28 object-cover"
          />
        )}
        <CardContent className="p-3 flex-1">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">
            {message.metadata.title}
          </h4>
          {message.content && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              "{message.content}"
            </p>
          )}
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto mt-2 text-xs"
            onClick={() => window.open(`https://myanimelist.net/anime/${message.metadata.mal_id}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Ver detalhes
          </Button>
        </CardContent>
      </div>
    </Card>
  );

  // Mensagem do sistema
  const renderSystemMessage = () => (
    <div className="text-center py-2">
      <p className="text-xs text-muted-foreground bg-muted/50 inline-block px-3 py-1 rounded-full">
        {message.content}
      </p>
    </div>
  );

  // Card de lista compartilhada
  const renderListCard = () => {
    const { list_id, list_name, list_description, list_is_public, list_item_count, list_cover_images, list_owner_id } = message.metadata;

    // Verificar se pode ver a lista
    const canViewList = list_is_public || list_owner_id === user?.id;

    /**
     * Navegar para a lista:
     * - Lista pública: abre a página pública (/shared/list/:id)
     * - Lista privada do próprio usuário: vai para a rota protegida /list/:id
     */
    const handleViewList = () => {
      if (!canViewList || !list_id) return;

      if (list_is_public) {
        navigate(`/shared/list/${list_id}`);
        return;
      }

      // Lista privada (somente dono) - usa rota protegida
      navigate(`/list/${list_id}`);
    };

    return (
      <Card className="overflow-hidden max-w-xs border-secondary/30 bg-secondary/5">
        {/* Header */}
        <div className="p-2 bg-secondary/10 border-b border-secondary/20">
          <p className="text-xs font-medium flex items-center gap-1">
            <List className="h-3 w-3 text-secondary-foreground" />
            Lista Compartilhada
          </p>
        </div>
        
        {/* Collage de imagens */}
        {list_cover_images && list_cover_images.length > 0 ? (
          <div className="grid grid-cols-2 h-24">
            {list_cover_images.slice(0, 4).map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className="w-full h-12 object-cover"
              />
            ))}
            {Array.from({ length: Math.max(0, 4 - list_cover_images.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-muted h-12" />
            ))}
          </div>
        ) : (
          <div className="h-24 bg-muted flex items-center justify-center">
            <List className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Conteúdo */}
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate flex-1">
              {list_name}
            </h4>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {list_is_public ? (
                <Globe className="h-2.5 w-2.5 mr-1" />
              ) : (
                <Lock className="h-2.5 w-2.5 mr-1" />
              )}
              {list_is_public ? 'Pública' : 'Privada'}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mb-1">
            {list_item_count} {list_item_count === 1 ? 'anime' : 'animes'}
          </p>
          
          {list_description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {list_description}
            </p>
          )}
          
          {/* Mensagem personalizada */}
          {message.content && !message.content.startsWith('Confira minha lista:') && (
            <p className="text-xs text-muted-foreground italic mb-2">
              "{message.content}"
            </p>
          )}
          
          {canViewList ? (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={handleViewList}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver lista
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Lista privada
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Renderizar reações
  const renderReactions = () => {
    if (!reactions?.length) return null;

    return (
      <div className={cn(
        'flex flex-wrap gap-1 mt-1',
        isOwn ? 'justify-end' : 'justify-start'
      )}>
        {reactions.map(reaction => (
          <button
            key={reaction.reaction_type}
            onClick={() => handleReaction(reaction.reaction_type)}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors',
              reaction.has_reacted 
                ? 'bg-primary/20 border border-primary/30' 
                : 'bg-muted/50 hover:bg-muted'
            )}
          >
            <span>{REACTION_TYPES[reaction.reaction_type]}</span>
            <span className="text-muted-foreground">{reaction.count}</span>
          </button>
        ))}
      </div>
    );
  };

  // Se for mensagem do sistema, renderizar centralizado
  if (message.message_type === 'system') {
    return renderSystemMessage();
  }

  return (
    <div className={cn(
      'flex gap-2 mb-2 group',
      isOwn ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className="w-8 shrink-0">
        {showAvatar && !isOwn && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {(message.sender.display_name || message.sender.username || 'U').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Conteúdo */}
      <div className={cn(
        'max-w-[75%] min-w-0',
        isOwn ? 'items-end' : 'items-start'
      )}>
        {/* Nome do remetente */}
        {showSenderName && (
          <p className="text-xs text-muted-foreground mb-1 px-1">
            {message.sender.display_name || message.sender.username}
          </p>
        )}

        {/* Balão da mensagem */}
        <div className={cn(
          'rounded-2xl px-4 py-2 relative',
          isOwn 
            ? 'bg-primary text-primary-foreground rounded-br-md' 
            : 'bg-muted rounded-bl-md',
          message.message_type !== 'text' && 'p-1 bg-transparent'
        )}>
          {renderContent()}

          {/* Hora e confirmação de leitura */}
          <span className={cn(
            'text-[10px] mt-1 flex items-center gap-1',
            isOwn ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground justify-start',
            message.message_type !== 'text' && 'text-muted-foreground px-1'
          )}>
            {time}
            {/* Ícone de confirmação de leitura com tooltip (somente para mensagens próprias) */}
            {isOwn && (
              isRead && readByDetails.length > 0 ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCheck className="h-3 w-3 text-blue-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <div className="text-xs">
                        <p className="font-medium mb-1">Visto por:</p>
                        {readByDetails.map((detail, i) => (
                          <p key={i} className="text-muted-foreground">
                            {detail.name} • {format(new Date(detail.readAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Check className="h-3 w-3" />
              )
            )}
          </span>
        </div>

        {/* Reações */}
        {renderReactions()}
      </div>

      {/* Menu de ações */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center flex items-center gap-1">
        {/* Botão de reação */}
        <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <SmilePlus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align={isOwn ? 'end' : 'start'}>
            <div className="flex gap-1">
              {(Object.entries(REACTION_TYPES) as [ReactionType, string][]).map(([type, emoji]) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className="text-xl p-1 hover:bg-muted rounded transition-colors"
                  title={type}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Menu dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
            <DropdownMenuItem onClick={onReply}>
              <Reply className="h-4 w-4 mr-2" />
              Responder
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
