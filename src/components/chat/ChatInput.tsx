import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Send, Smile, Film, Star, List } from 'lucide-react';
import SelectAnimeForChat from './SelectAnimeForChat';
import SelectListForChat from './SelectListForChat';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onSendAnime: (anime: any) => void;
  onSendRecommendation: (anime: any, message?: string) => void;
  onSendList?: (list: any, message?: string) => void;
  conversationId: string;
  recipientId?: string;
  onTypingChange?: (isTyping: boolean) => void;
}

// Lista de emojis comuns
const COMMON_EMOJIS = ['😊', '😂', '❤️', '🔥', '👍', '😍', '🎉', '😭', '🤔', '👀', '💪', '🙏'];

// Limite máximo de caracteres
const MAX_MESSAGE_LENGTH = 2000;

// Componente de input do chat
function ChatInput({
  onSendMessage,
  onSendAnime,
  onSendRecommendation,
  onSendList,
  conversationId,
  recipientId,
  onTypingChange,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showAnimeSelector, setShowAnimeSelector] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);
  const [animeMode, setAnimeMode] = useState<'card' | 'recommendation'>('card');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTypingStateRef = useRef(false);

  // Gerenciar estado de "digitando" com debounce otimizado
  const updateTypingState = useCallback((isTyping: boolean) => {
    if (!onTypingChange || lastTypingStateRef.current === isTyping) return;
    lastTypingStateRef.current = isTyping;
    onTypingChange(isTyping);
  }, [onTypingChange]);

  useEffect(() => {
    const isCurrentlyTyping = message.length > 0;

    if (isCurrentlyTyping && !wasTypingRef.current) {
      updateTypingState(true);
      wasTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingState(false);
        wasTypingRef.current = false;
      }, 2000);
    } else {
      updateTypingState(false);
      wasTypingRef.current = false;
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, updateTypingState]);

  useEffect(() => {
    return () => {
      updateTypingState(false);
    };
  }, [updateTypingState]);

  // Enviar ao pressionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Enviar mensagem de texto
  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      updateTypingState(false);
      wasTypingRef.current = false;
      inputRef.current?.focus();
    }
  }, [message, onSendMessage, updateTypingState]);

  // Adicionar emoji
  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  // Abrir seletor de anime
  const openAnimeSelector = (mode: 'card' | 'recommendation') => {
    setAnimeMode(mode);
    setShowAnimeSelector(true);
  };

  // Callback quando anime é selecionado
  const handleAnimeSelected = (anime: any, customMessage?: string) => {
    if (animeMode === 'card') {
      onSendAnime(anime);
    } else {
      onSendRecommendation(anime, customMessage);
    }
    setShowAnimeSelector(false);
  };

  // Callback quando lista é selecionada
  const handleListSelected = (list: any, customMessage?: string) => {
    onSendList?.(list, customMessage);
    setShowListSelector(false);
  };

  return (
    <>
      <div className="p-4 border-t border-border bg-card">
        {/* Botões de ação */}
        <div className="flex items-center gap-1 mb-2">
          {/* Emoji picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {COMMON_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-xl p-1 hover:bg-muted rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Compartilhar anime */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => openAnimeSelector('card')}
            title="Compartilhar anime"
          >
            <Film className="h-4 w-4" />
          </Button>

          {/* Compartilhar lista */}
          {onSendList && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setShowListSelector(true)}
              title="Compartilhar lista"
            >
              <List className="h-4 w-4" />
            </Button>
          )}

          {/* Indicar anime */}
          {recipientId && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => openAnimeSelector('recommendation')}
              title="Indicar anime"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Campo de mensagem com limite de caracteres */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder="Digite uma mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleKeyDown}
              className="flex-1"
              maxLength={MAX_MESSAGE_LENGTH}
          />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {/* Contador de caracteres */}
          {message.length > MAX_MESSAGE_LENGTH * 0.8 && (
            <p className={`text-xs text-right ${message.length >= MAX_MESSAGE_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
              {message.length}/{MAX_MESSAGE_LENGTH}
            </p>
          )}
        </div>
      </div>

      {/* Modal de seleção de anime */}
      <SelectAnimeForChat
        open={showAnimeSelector}
        onOpenChange={setShowAnimeSelector}
        onSelect={handleAnimeSelected}
        mode={animeMode}
        recipientId={recipientId}
      />

      {/* Modal de seleção de lista */}
      <SelectListForChat
        open={showListSelector}
        onOpenChange={setShowListSelector}
        onSelect={handleListSelected}
      />
    </>
  );
}

export default ChatInput;
