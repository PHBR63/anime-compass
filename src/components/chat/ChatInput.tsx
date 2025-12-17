import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Send, Smile, Image, Film, Star } from 'lucide-react';
import SelectAnimeForChat from './SelectAnimeForChat';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onSendAnime: (anime: any) => void;
  onSendRecommendation: (anime: any, message?: string) => void;
  conversationId: string;
  recipientId?: string;
}

// Lista de emojis comuns
const COMMON_EMOJIS = ['😊', '😂', '❤️', '🔥', '👍', '😍', '🎉', '😭', '🤔', '👀', '💪', '🙏'];

// Componente de input do chat
export default function ChatInput({
  onSendMessage,
  onSendAnime,
  onSendRecommendation,
  conversationId,
  recipientId,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showAnimeSelector, setShowAnimeSelector] = useState(false);
  const [animeMode, setAnimeMode] = useState<'card' | 'recommendation'>('card');

  // Enviar mensagem ao pressionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Enviar mensagem de texto
  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  // Adicionar emoji ao texto
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

          {/* Enviar card de anime */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => openAnimeSelector('card')}
            title="Compartilhar anime"
          >
            <Film className="h-4 w-4" />
          </Button>

          {/* Enviar indicação */}
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

        {/* Campo de mensagem */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!message.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
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
    </>
  );
}
