import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

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

const CONVERSATIONS_PER_PAGE = 20;

// Hook para buscar todas as conversas do usuário com paginação e busca
export function useConversations(searchQuery?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Configurar realtime para novas conversas/participações
  useEffect(() => {
    if (!user) return;

    // Escutar novas participações do usuário (quando alguém adiciona ele em conversa)
    const channel = supabase
      .channel('user-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Quando o usuário é adicionado a uma nova conversa, atualizar lista
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // Atualizar quando conversas são modificadas
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['conversations', user?.id, searchQuery],
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
      let query = supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      // Aplicar filtro de busca no nome do grupo
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data: conversations, error: convError } = await query;

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

      // Contar mensagens não lidas por conversa (otimizado)
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
      const result = conversations.map(conv => {
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

      // Filtrar por nome de participante em conversas diretas se há busca
      if (searchQuery) {
        return result.filter(conv => {
          if (conv.type === 'group') return true; // Já filtrado acima
          const otherName = conv.other_participant?.display_name || conv.other_participant?.username || '';
          return otherName.toLowerCase().includes(searchQuery.toLowerCase());
        });
      }

      return result;
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
      console.log('[useCreateConversation] Iniciando criação de conversa:', { type, participantIds, name, userId: user?.id });
      
      if (!user) {
        console.error('[useCreateConversation] Usuário não autenticado');
        throw new Error('Não autenticado');
      }

      // Para chat direto, verificar se já existe
      if (type === 'direct' && participantIds.length === 1) {
        const otherId = participantIds[0];
        console.log('[useCreateConversation] Verificando conversa direta existente com:', otherId);
        
        // Buscar conversas diretas existentes
        const { data: myConvs, error: myConvsError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (myConvsError) {
          console.error('[useCreateConversation] Erro ao buscar participações:', myConvsError);
        }

        if (myConvs?.length) {
          const { data: otherConvs, error: otherConvsError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', otherId)
            .in('conversation_id', myConvs.map(c => c.conversation_id));

          if (otherConvsError) {
            console.error('[useCreateConversation] Erro ao buscar conversas do outro:', otherConvsError);
          }

          if (otherConvs?.length) {
            // Verificar se alguma é do tipo 'direct'
            const { data: directConv, error: directError } = await supabase
              .from('conversations')
              .select('*')
              .in('id', otherConvs.map(c => c.conversation_id))
              .eq('type', 'direct')
              .maybeSingle();

            if (directError) {
              console.error('[useCreateConversation] Erro ao buscar conversa direta:', directError);
            }

            if (directConv) {
              console.log('[useCreateConversation] Conversa direta existente encontrada:', directConv.id);
              return directConv;
            }
          }
        }
      }

      // Criar nova conversa
      console.log('[useCreateConversation] Criando nova conversa no banco...');
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type,
          name: type === 'group' ? name : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) {
        console.error('[useCreateConversation] Erro ao criar conversa:', {
          code: convError.code,
          message: convError.message,
          details: convError.details,
          hint: convError.hint,
        });
        throw new Error(`Erro ao criar conversa: ${convError.message} (código: ${convError.code})`);
      }

      console.log('[useCreateConversation] Conversa criada:', conversation.id);

      // Adicionar criador como admin
      console.log('[useCreateConversation] Adicionando criador como admin...');
      const { error: creatorError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
        });

      if (creatorError) {
        console.error('[useCreateConversation] Erro ao adicionar criador:', {
          code: creatorError.code,
          message: creatorError.message,
          details: creatorError.details,
          hint: creatorError.hint,
        });
        throw new Error(`Erro ao adicionar criador: ${creatorError.message} (código: ${creatorError.code})`);
      }

      // Adicionar outros participantes
      const participantsToAdd = participantIds
        .filter(id => id !== user.id)
        .map(id => ({
          conversation_id: conversation.id,
          user_id: id,
          role: 'member',
        }));

      if (participantsToAdd.length) {
        console.log('[useCreateConversation] Adicionando participantes:', participantsToAdd.length);
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert(participantsToAdd);

        if (partError) {
          console.error('[useCreateConversation] Erro ao adicionar participantes:', {
            code: partError.code,
            message: partError.message,
            details: partError.details,
            hint: partError.hint,
          });
          throw new Error(`Erro ao adicionar participantes: ${partError.message} (código: ${partError.code})`);
        }
      }

      console.log('[useCreateConversation] Conversa criada com sucesso:', conversation.id);
      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('[useCreateConversation] Mutation error:', error);
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
  const queryClient = useQueryClient();

  // Configurar realtime para atualizar contador instantaneamente
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          // Se a mensagem não é do usuário atual, atualizar contador
          if (payload.new.sender_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Quando last_read_at é atualizado, atualizar contador
          queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
    refetchInterval: 60000, // Backup: atualizar a cada 60 segundos
  });
}

// Hook para deletar/sair de uma conversa
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Não autenticado');

      // Verificar se é admin do grupo ou conversa direta
      const { data: participation, error: partError } = await supabase
        .from('conversation_participants')
        .select('role')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (partError) throw partError;

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('type, created_by')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Se for grupo e usuário é admin, deletar toda a conversa
      // Se for conversa direta, apenas sair (remover participação)
      if (conversation.type === 'group' && participation.role === 'admin') {
        // Deletar todas as mensagens primeiro
        await supabase
          .from('chat_messages')
          .delete()
          .eq('conversation_id', conversationId);

        // Deletar todos os participantes
        await supabase
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', conversationId);

        // Deletar a conversa
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId);

        if (error) throw error;
      } else {
        // Apenas sair da conversa (remover participação)
        const { error } = await supabase
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
