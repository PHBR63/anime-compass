import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations, useMarkConversationAsRead } from '@/hooks/useConversations';
import { useChatMessages, useSendMessage, useSendAnimeCard, useSendListCard } from '@/hooks/useChatMessages';
import { useSendRecommendation } from '@/hooks/useAnimeRecommendations';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import NewChatModal from '@/components/chat/NewChatModal';
import { useIsCompact } from '@/hooks/use-mobile';

// Página principal do Chat
export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  // Usa layout compacto para mobile E tablet (< 1024px)
  const isCompact = useIsCompact();
  
  const { data: conversations, isLoading: loadingConversations } = useConversations();
  const { data: messages, isLoading: loadingMessages } = useChatMessages(selectedConversationId);
  const markAsRead = useMarkConversationAsRead();
  const sendMessage = useSendMessage();
  const sendAnimeCard = useSendAnimeCard();
  const sendRecommendation = useSendRecommendation();
  const sendListCard = useSendListCard();

  // Conversa selecionada
  const selectedConversation = conversations?.find(c => c.id === selectedConversationId) || null;

  // Atualizar URL quando conversa mudar
  useEffect(() => {
    if (selectedConversationId) {
      setSearchParams({ conversation: selectedConversationId });
    } else {
      setSearchParams({});
    }
  }, [selectedConversationId, setSearchParams]);

  // Marcar como lida quando selecionar conversa
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unread_count) {
      markAsRead.mutate(selectedConversationId);
    }
  }, [selectedConversationId, selectedConversation?.unread_count]);

  // Limpar seleção se conversa foi deletada
  useEffect(() => {
    if (selectedConversationId && conversations && !conversations.find(c => c.id === selectedConversationId)) {
      setSelectedConversationId(null);
      if (isCompact) {
        setMobileView('list');
      }
    }
  }, [conversations, selectedConversationId, isCompact]);

  // Selecionar conversa
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    if (isCompact) {
      setMobileView('chat');
    }
  };

  // Voltar para lista (mobile)
  const handleBack = () => {
    setMobileView('list');
    setSelectedConversationId(null);
  };

  // Enviar mensagem de texto
  const handleSendMessage = (content: string, replyTo?: string) => {
    if (selectedConversationId) {
      sendMessage.mutate({
        conversationId: selectedConversationId,
        content,
        messageType: 'text',
        replyTo,
      });
    }
  };

  // Enviar card de anime
  const handleSendAnime = (anime: any) => {
    if (selectedConversationId) {
      sendAnimeCard.mutate({
        conversationId: selectedConversationId,
        anime: {
          mal_id: anime.mal_id,
          title: anime.title,
          image_url: anime.image_url,
          episodes: anime.episodes,
          score: anime.score,
        },
      });
    }
  };

  // Enviar indicação
  const handleSendRecommendation = async (anime: any, message?: string) => {
    if (selectedConversationId && selectedConversation?.type === 'direct') {
      const recipientId = selectedConversation.other_participant?.user_id;
      if (!recipientId) return;

      // Enviar mensagem no chat com a indicação
      sendMessage.mutate({
        conversationId: selectedConversationId,
        content: message || `Estou te indicando: ${anime.title}`,
        messageType: 'recommendation',
        metadata: {
          mal_id: anime.mal_id,
          title: anime.title,
          image_url: anime.image_url,
        },
      });
    }
  };

  // Enviar card de lista
  const handleSendList = (list: any, message?: string) => {
    if (selectedConversationId) {
      sendListCard.mutate({
        conversationId: selectedConversationId,
        list,
        message,
      });
    }
  };

  // Callback quando nova conversa é criada
  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    if (isCompact) {
      setMobileView('chat');
    }
  };

  // Layout responsivo (mobile e tablet usam layout de uma coluna)
  if (isCompact) {
    return (
      // Mobile: tela toda | Tablet+: considera sidebar (md:left-64)
      <div className="fixed inset-0 md:left-64 bg-background z-10">
        {mobileView === 'list' ? (
          <ConversationList
            conversations={conversations || []}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            onNewChat={() => setShowNewChatModal(true)}
            isLoading={loadingConversations}
          />
        ) : (
          <ChatWindow
            conversation={selectedConversation}
            messages={messages || []}
            isLoading={loadingMessages}
            onBack={handleBack}
            onSendMessage={handleSendMessage}
            onSendAnime={handleSendAnime}
            onSendRecommendation={handleSendRecommendation}
            onSendList={handleSendList}
          />
        )}

        <NewChatModal
          open={showNewChatModal}
          onOpenChange={setShowNewChatModal}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    );
  }

  // Layout desktop (tela grande > 1024px)
  return (
    <div className="fixed inset-0 md:left-64 flex bg-background z-10">
      {/* Lista de conversas - largura responsiva */}
      <div className="w-72 lg:w-80 xl:w-96 shrink-0">
        <ConversationList
          conversations={conversations || []}
          selectedId={selectedConversationId}
          onSelect={handleSelectConversation}
          onNewChat={() => setShowNewChatModal(true)}
          isLoading={loadingConversations}
        />
      </div>

      {/* Janela de chat */}
      <ChatWindow
        conversation={selectedConversation}
        messages={messages || []}
        isLoading={loadingMessages}
        onSendMessage={handleSendMessage}
        onSendAnime={handleSendAnime}
        onSendRecommendation={handleSendRecommendation}
        onSendList={handleSendList}
      />

      <NewChatModal
        open={showNewChatModal}
        onOpenChange={setShowNewChatModal}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
