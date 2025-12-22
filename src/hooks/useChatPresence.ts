import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Interface para status de presença do usuário
interface UserPresence {
  userId: string;
  displayName: string;
  online_at: string;
  typing_in?: string; // ID da conversa onde está digitando
}

// Interface para usuário digitando com nome e avatar
interface TypingUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Hook para gerenciar presença de usuários em tempo real
 * Usa Supabase Realtime para rastrear status online e digitando
 */
export function useChatPresence(conversationId: string | null) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Criar canal de presença para a conversa
    const channel = supabase.channel(`presence-${conversationId}`);
    channelRef.current = channel;

    // Escutar eventos de presença
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        const typing: TypingUser[] = [];

        // Processar estado de todos os usuários
        Object.values(state).forEach((presences) => {
          presences.forEach((presence: any) => {
            if (presence.userId) {
              online.add(presence.userId);
              // Se está digitando nesta conversa e não é o usuário atual
              if (presence.typing_in === conversationId && presence.userId !== user.id) {
                typing.push({
                  userId: presence.userId,
                  displayName: presence.displayName || 'Alguém',
                  avatarUrl: presence.avatarUrl,
                });
              }
            }
          });
        });

        setOnlineUsers(online);
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.userId) {
            setOnlineUsers(prev => new Set([...prev, presence.userId]));
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.userId) {
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(presence.userId);
              return newSet;
            });
            setTypingUsers(prev => prev.filter(t => t.userId !== presence.userId));
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Buscar dados do usuário atual
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('id', user.id)
            .single();

          const displayName = profile?.display_name || profile?.username || 'Usuário';

          // Rastrear presença do usuário atual com avatar
          await channel.track({
            userId: user.id,
            displayName,
            avatarUrl: profile?.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  // Função para indicar que está digitando
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !user || !channelRef.current) return;

    // Buscar dados do usuário atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    const displayName = profile?.display_name || profile?.username || 'Usuário';

    await channelRef.current.track({
      userId: user.id,
      displayName,
      avatarUrl: profile?.avatar_url,
      online_at: new Date().toISOString(),
      typing_in: isTyping ? conversationId : undefined,
    });
  }, [conversationId, user]);

  return {
    onlineUsers,
    typingUsers,
    setTyping,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    getTypingUsers: () => typingUsers.filter(t => t.userId !== user?.id),
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
            if (presence.userId) {
              online.add(presence.userId);
            }
          });
        });

        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
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
