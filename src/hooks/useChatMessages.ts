import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

// Interface para mensagem com dados do remetente
export interface ChatMessageWithSender {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'anime_card' | 'recommendation' | 'image' | 'system' | 'list_card';
  metadata: {
    mal_id?: number;
    title?: string;
    image_url?: string;
    recommendation_id?: string;
    episodes?: number;
    score?: number;
    // Campos para list_card
    list_id?: string;
    list_name?: string;
    list_description?: string;
    list_is_public?: boolean;
    list_item_count?: number;
    list_cover_images?: string[];
    list_owner_id?: string;
  };
  reply_to: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  replied_message?: {
    content: string | null;
    sender_name: string | null;
  };
}

const MESSAGES_PER_PAGE = 50;

// Hook para buscar mensagens de uma conversa com paginação
export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chatMessages', conversationId],
    queryFn: async () => {
      if (!conversationId || !user) return [];

      // Buscar mensagens (últimas 50 por padrão)
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;
      if (!messages?.length) return [];

      // Inverter para ordem cronológica
      const orderedMessages = messages.reverse();

      // Buscar perfis dos remetentes
      const senderIds = [...new Set(orderedMessages.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Buscar mensagens respondidas
      const replyIds = orderedMessages.filter(m => m.reply_to).map(m => m.reply_to);
      let repliedMessages = new Map();
      
      if (replyIds.length) {
        const { data: replies } = await supabase
          .from('chat_messages')
          .select('id, content, sender_id')
          .in('id', replyIds);

        replies?.forEach(r => {
          const senderProfile = profileMap.get(r.sender_id);
          repliedMessages.set(r.id, {
            content: r.content,
            sender_name: senderProfile?.display_name || senderProfile?.username || 'Usuário',
          });
        });
      }

      // Montar resultado
      return orderedMessages.map(msg => ({
        ...msg,
        metadata: msg.metadata || {},
        sender: profileMap.get(msg.sender_id) || {
          id: msg.sender_id,
          username: null,
          display_name: 'Usuário',
          avatar_url: null,
        },
        replied_message: msg.reply_to ? repliedMessages.get(msg.reply_to) : undefined,
      })) as ChatMessageWithSender[];
    },
    enabled: !!conversationId && !!user,
  });

  // Configurar realtime para novas mensagens
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Invalidar query para buscar novas mensagens
          queryClient.invalidateQueries({ queryKey: ['chatMessages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  return query;
}

// Hook para carregar mais mensagens antigas
export function useLoadMoreMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beforeDate: string) => {
      if (!conversationId || !user) return [];

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', beforeDate)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;
      return messages?.reverse() || [];
    },
    onSuccess: (newMessages) => {
      if (!conversationId || newMessages.length === 0) return;

      // Adicionar mensagens antigas ao cache existente
      queryClient.setQueryData(['chatMessages', conversationId], (oldData: ChatMessageWithSender[] | undefined) => {
        if (!oldData) return newMessages;
        return [...newMessages, ...oldData];
      });
    },
  });
}

// Limite máximo de caracteres para mensagens de chat
const MAX_MESSAGE_LENGTH = 2000;

// Hook para enviar mensagem com optimistic update para resposta instantânea
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      messageType = 'text',
      metadata = {},
      replyTo,
    }: {
      conversationId: string;
      content?: string;
      messageType?: 'text' | 'anime_card' | 'recommendation' | 'image' | 'system' | 'list_card';
      metadata?: Record<string, any>;
      replyTo?: string;
    }) => {
      if (!user) throw new Error('Não autenticado');

      // Validar tamanho da mensagem antes de enviar
      if (content && content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)`);
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content?.slice(0, MAX_MESSAGE_LENGTH), // Garantir truncamento
          message_type: messageType,
          metadata,
          reply_to: replyTo,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar updated_at da conversa (não bloqueia)
      supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    // Optimistic update: adiciona mensagem instantaneamente na UI
    onMutate: async (variables) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['chatMessages', variables.conversationId] });
      
      const previousMessages = queryClient.getQueryData(['chatMessages', variables.conversationId]);
      
      // Criar mensagem temporária
      const tempMessage: ChatMessageWithSender = {
        id: `temp-${Date.now()}`,
        conversation_id: variables.conversationId,
        sender_id: user.id,
        content: variables.content || null,
        message_type: (variables.messageType || 'text') as 'text' | 'anime_card' | 'recommendation' | 'image' | 'system' | 'list_card',
        metadata: variables.metadata || {},
        reply_to: variables.replyTo || null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          id: user.id,
          username: null,
          display_name: 'Você',
          avatar_url: null,
        },
      };
      
      // Adicionar mensagem ao cache
      queryClient.setQueryData(['chatMessages', variables.conversationId], (old: ChatMessageWithSender[] | undefined) => {
        return [...(old || []), tempMessage];
      });
      
      return { previousMessages };
    },
    onError: (_, variables, context) => {
      // Reverter em caso de erro
      if (context?.previousMessages) {
        queryClient.setQueryData(['chatMessages', variables.conversationId], context.previousMessages);
      }
    },
    onSettled: (_, __, variables) => {
      // Revalidar para sincronizar com servidor
      queryClient.invalidateQueries({ queryKey: ['chatMessages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook para deletar mensagem (soft delete)
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true, content: null })
        .eq('id', messageId);

      if (error) throw error;
      return { conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', data.conversationId] });
    },
  });
}

// Hook para enviar card de anime
export function useSendAnimeCard() {
  const sendMessage = useSendMessage();

  return useMutation({
    mutationFn: async ({
      conversationId,
      anime,
    }: {
      conversationId: string;
      anime: {
        mal_id: number;
        title: string;
        image_url: string;
        episodes?: number;
        score?: number;
      };
    }) => {
      return sendMessage.mutateAsync({
        conversationId,
        content: anime.title,
        messageType: 'anime_card',
        metadata: {
          mal_id: anime.mal_id,
          title: anime.title,
          image_url: anime.image_url,
          episodes: anime.episodes,
          score: anime.score,
        },
      });
    },
  });
}

// Hook para enviar indicação via chat
export function useSendRecommendationInChat() {
  const sendMessage = useSendMessage();

  return useMutation({
    mutationFn: async ({
      conversationId,
      recommendationId,
      anime,
      message,
    }: {
      conversationId: string;
      recommendationId: string;
      anime: {
        mal_id: number;
        title: string;
        image_url: string;
      };
      message?: string;
    }) => {
      return sendMessage.mutateAsync({
        conversationId,
        content: message || `Estou te indicando: ${anime.title}`,
        messageType: 'recommendation',
        metadata: {
          recommendation_id: recommendationId,
          mal_id: anime.mal_id,
          title: anime.title,
          image_url: anime.image_url,
        },
      });
    },
  });
}

// Hook para enviar card de lista no chat
export function useSendListCard() {
  const sendMessage = useSendMessage();

  return useMutation({
    mutationFn: async ({
      conversationId,
      list,
      message,
    }: {
      conversationId: string;
      list: {
        id: string;
        name: string;
        description: string | null;
        is_public: boolean;
        item_count: number;
        cover_images: string[];
        owner_id: string;
      };
      message?: string;
    }) => {
      return sendMessage.mutateAsync({
        conversationId,
        content: message || `Confira minha lista: ${list.name}`,
        messageType: 'list_card',
        metadata: {
          list_id: list.id,
          list_name: list.name,
          list_description: list.description || undefined,
          list_is_public: list.is_public,
          list_item_count: list.item_count,
          list_cover_images: list.cover_images,
          list_owner_id: list.owner_id,
        },
      });
    },
  });
}
