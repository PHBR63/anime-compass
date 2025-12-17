import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Interface para status de presença do usuário
interface UserPresence {
  oderId: string;
  online_at: string;
  typing_in?: string; // ID da conversa onde está digitando
}

/**
 * Hook para gerenciar presença de usuários em tempo real
 * Usa Supabase Realtime para rastrear status online e digitando
 */
export function useChatPresence(conversationId: string | null) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // oderId -> displayName

  useEffect(() => {
    if (!conversationId || !user) return;

    // Criar canal de presença para a conversa
    const channel = supabase.channel(`presence-${conversationId}`);

    // Escutar eventos de presença
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        const typing = new Map<string, string>();

        // Processar estado de todos os usuários
        Object.values(state).forEach((presences) => {
          presences.forEach((presence: any) => {
            if (presence.oderId) {
              online.add(presence.oderId);
              // Se está digitando nesta conversa
              if (presence.typing_in === conversationId) {
                typing.set(presence.oderId, presence.oderId);
              }
            }
          });
        });

        setOnlineUsers(online);
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.oderId) {
            setOnlineUsers(prev => new Set([...prev, presence.oderId]));
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.oderId) {
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(presence.oderId);
              return newSet;
            });
            setTypingUsers(prev => {
              const newMap = new Map(prev);
              newMap.delete(presence.oderId);
              return newMap;
            });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Rastrear presença do usuário atual
          await channel.track({
            oderId: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Função para indicar que está digitando
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`presence-${conversationId}`);
    
    await channel.track({
      oderId: user.id,
      online_at: new Date().toISOString(),
      typing_in: isTyping ? conversationId : undefined,
    });
  }, [conversationId, user]);

  return {
    onlineUsers,
    typingUsers,
    setTyping,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    getTypingUserIds: () => Array.from(typingUsers.keys()).filter(id => id !== user?.id),
  };
}

/**
 * Hook global para rastrear presença do usuário no app
 */
export function useGlobalPresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Canal global de presença
    const channel = supabase.channel('global-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();

        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence: any) => {
            if (presence.oderId) {
              online.add(presence.oderId);
            }
          });
        });

        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            oderId: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    onlineUsers,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
  };
}
