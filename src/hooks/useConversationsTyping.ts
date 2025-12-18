import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Interface para usuário digitando
interface TypingUser {
  userId: string;
  displayName: string;
}

// Mapa de conversationId -> usuários digitando
type TypingMap = Map<string, TypingUser[]>;

/**
 * Hook global para rastrear quem está digitando em todas as conversas do usuário
 * Usa canais de presença do Supabase Realtime
 */
export function useConversationsTyping(conversationIds: string[]) {
  const { user } = useAuth();
  const [typingMap, setTypingMap] = useState<TypingMap>(new Map());
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());

  useEffect(() => {
    if (!user || conversationIds.length === 0) return;

    // Limpar canais antigos que não estão mais na lista
    const currentIds = new Set(conversationIds);
    channelsRef.current.forEach((channel, id) => {
      if (!currentIds.has(id)) {
        supabase.removeChannel(channel);
        channelsRef.current.delete(id);
      }
    });

    // Criar novos canais para conversas que ainda não têm
    conversationIds.forEach((conversationId) => {
      if (channelsRef.current.has(conversationId)) return;

      const channel = supabase.channel(`typing-${conversationId}`);
      channelsRef.current.set(conversationId, channel);

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const typing: TypingUser[] = [];

          // Processar estado de todos os usuários
          Object.values(state).forEach((presences) => {
            presences.forEach((presence: any) => {
              // Se está digitando nesta conversa e não é o usuário atual
              if (
                presence.typing_in === conversationId && 
                presence.userId && 
                presence.userId !== user.id
              ) {
                typing.push({
                  userId: presence.userId,
                  displayName: presence.displayName || 'Alguém',
                });
              }
            });
          });

          setTypingMap((prev) => {
            const newMap = new Map(prev);
            if (typing.length > 0) {
              newMap.set(conversationId, typing);
            } else {
              newMap.delete(conversationId);
            }
            return newMap;
          });
        })
        .subscribe();
    });

    return () => {
      // Cleanup: remover todos os canais
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
    };
  }, [user, conversationIds.join(',')]); // Re-executar quando a lista de IDs mudar

  return {
    typingMap,
    // Função auxiliar para verificar se há alguém digitando em uma conversa
    getTypingUsers: (conversationId: string): TypingUser[] => {
      return typingMap.get(conversationId) || [];
    },
    // Verificar se há alguém digitando
    isTyping: (conversationId: string): boolean => {
      return (typingMap.get(conversationId)?.length || 0) > 0;
    },
  };
}
