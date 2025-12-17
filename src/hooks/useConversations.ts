import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Interface para conversa com última mensagem e participantes
export interface ConversationWithDetails {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string | null;
    message_type: string;
    created_at: string;
    sender_name: string | null;
  };
  unread_count: number;
  participants: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    role: string;
  }[];
  other_participant?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Hook para buscar todas as conversas do usuário
export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar conversas onde o usuário participa
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (partError) throw partError;
      if (!participations?.length) return [];

      const conversationIds = participations.map(p => p.conversation_id);
      const lastReadMap = new Map(participations.map(p => [p.conversation_id, p.last_read_at]));

      // Buscar detalhes das conversas
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;
      if (!conversations?.length) return [];

      // Buscar participantes de todas as conversas
      const { data: allParticipants, error: allPartError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, role')
        .in('conversation_id', conversationIds);

      if (allPartError) throw allPartError;

      // Buscar perfis dos participantes
      const participantIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', participantIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Buscar última mensagem de cada conversa
      const { data: lastMessages, error: msgError } = await supabase
        .from('chat_messages')
        .select('conversation_id, content, message_type, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Agrupar última mensagem por conversa
      const lastMessageMap = new Map<string, typeof lastMessages[0]>();
      lastMessages?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      });

      // Contar mensagens não lidas por conversa
      const unreadCounts = new Map<string, number>();
      for (const convId of conversationIds) {
        const lastRead = lastReadMap.get(convId);
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('is_deleted', false)
          .neq('sender_id', user.id)
          .gt('created_at', lastRead || '1970-01-01');
        
        unreadCounts.set(convId, count || 0);
      }

      // Montar resultado final
      return conversations.map(conv => {
        const participants = allParticipants
          ?.filter(p => p.conversation_id === conv.id)
          .map(p => ({
            ...p,
            ...profileMap.get(p.user_id),
          })) || [];

        const lastMsg = lastMessageMap.get(conv.id);
        const senderProfile = lastMsg ? profileMap.get(lastMsg.sender_id) : null;

        // Para chat direto, identificar o outro participante
        const otherParticipant = conv.type === 'direct'
          ? participants.find(p => p.user_id !== user.id)
          : undefined;

        return {
          ...conv,
          participants,
          other_participant: otherParticipant,
          last_message: lastMsg ? {
            content: lastMsg.content,
            message_type: lastMsg.message_type,
            created_at: lastMsg.created_at,
            sender_name: senderProfile?.display_name || senderProfile?.username || 'Usuário',
          } : undefined,
          unread_count: unreadCounts.get(conv.id) || 0,
        } as ConversationWithDetails;
      });
    },
    enabled: !!user,
  });
}

// Hook para criar uma nova conversa (direta ou grupo)
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      type, 
      participantIds, 
      name 
    }: { 
      type: 'direct' | 'group'; 
      participantIds: string[]; 
      name?: string;
    }) => {
      if (!user) throw new Error('Não autenticado');

      // Para chat direto, verificar se já existe
      if (type === 'direct' && participantIds.length === 1) {
        const otherId = participantIds[0];
        
        // Buscar conversas diretas existentes
        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (myConvs?.length) {
          const { data: otherConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', otherId)
            .in('conversation_id', myConvs.map(c => c.conversation_id));

          if (otherConvs?.length) {
            // Verificar se alguma é do tipo 'direct'
            const { data: directConv } = await supabase
              .from('conversations')
              .select('*')
              .in('id', otherConvs.map(c => c.conversation_id))
              .eq('type', 'direct')
              .single();

            if (directConv) {
              return directConv;
            }
          }
        }
      }

      // Criar nova conversa
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type,
          name: type === 'group' ? name : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Adicionar criador como admin
      const { error: creatorError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
        });

      if (creatorError) throw creatorError;

      // Adicionar outros participantes
      const participantsToAdd = participantIds
        .filter(id => id !== user.id)
        .map(id => ({
          conversation_id: conversation.id,
          user_id: id,
          role: 'member',
        }));

      if (participantsToAdd.length) {
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert(participantsToAdd);

        if (partError) throw partError;
      }

      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook para marcar conversa como lida
export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook para contar total de mensagens não lidas
export function useUnreadMessagesCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unreadMessagesCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participations?.length) return 0;

      let total = 0;
      for (const part of participations) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', part.conversation_id)
          .eq('is_deleted', false)
          .neq('sender_id', user.id)
          .gt('created_at', part.last_read_at || '1970-01-01');
        
        total += count || 0;
      }

      return total;
    },
    enabled: !!user,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
}
