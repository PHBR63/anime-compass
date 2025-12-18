import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from './usePushNotifications';

// Tipo para notificação do banco
export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_accepted' | 'review_like' | 'achievement' | 'system';
  title: string;
  message: string | null;
  data: {
    anime_id?: number;
    anime_title?: string;
    anime_image?: string;
    friend_id?: string;
    friend_name?: string;
    status?: string;
  } | null;
  is_read: boolean;
  created_at: string;
}

// Hook para buscar notificações do usuário
export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Hook para contar notificações não lidas
export function useUnreadNotificationsCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter(n => !n.is_read).length || 0;
}

// Hook para marcar notificação como lida
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });
}

// Hook para marcar todas como lidas
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });
}

// Hook para deletar notificação
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });
}

// Hook para escutar notificações em tempo real com push notifications
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sendNotification, isEnabled, requestPermission, permission } = usePushNotifications();

  // Função para gerar título e corpo da push notification baseado no tipo
  const getPushContent = useCallback((notification: Notification) => {
    const data = notification.data || {};
    
    switch (notification.type) {
      case 'friend_request':
        return {
          title: '👋 Nova solicitação de amizade',
          body: notification.message || `${data.friend_name || 'Alguém'} quer ser seu amigo!`
        };
      case 'friend_accepted':
        return {
          title: '🎉 Amizade aceita!',
          body: notification.message || `${data.friend_name || 'Alguém'} aceitou sua solicitação!`
        };
      case 'review_like':
        return {
          title: '❤️ Sua review recebeu um like!',
          body: notification.message || `Alguém curtiu sua review de ${data.anime_title || 'um anime'}`
        };
      case 'achievement':
        return {
          title: '🏆 Nova conquista desbloqueada!',
          body: notification.message || notification.title
        };
      case 'system':
        return {
          title: '📢 ' + notification.title,
          body: notification.message || ''
        };
      default:
        return {
          title: notification.title,
          body: notification.message || ''
        };
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Escutar novas notificações via Supabase Realtime
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Atualizar cache do React Query
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });

          // Mostrar toast com a notificação
          toast({
            title: newNotification.title,
            description: newNotification.message || undefined,
          });

          // Enviar push notification se habilitado
          if (isEnabled) {
            const { title, body } = getPushContent(newNotification);
            sendNotification(title, {
              body,
              tag: `notification-${newNotification.type}-${newNotification.id}`,
              data: newNotification.data,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast, isEnabled, sendNotification, getPushContent]);

  return {
    requestPermission,
    isEnabled,
    permission,
  };
}

// Função para formatar tempo relativo
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}
