import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Interface para preferências de notificação do usuário
 */
export interface NotificationPreferences {
  id: string;
  user_id: string;
  friend_added_anime: boolean;
  friend_started_watching: boolean;
  friend_requests: boolean;
  friend_accepted: boolean;
  review_likes: boolean;
  achievements: boolean;
  recommendations: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Valores padrão das preferências
 */
const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  friend_added_anime: true,
  friend_started_watching: true,
  friend_requests: true,
  friend_accepted: true,
  review_likes: true,
  achievements: true,
  recommendations: true,
};

/**
 * Hook para buscar preferências de notificação do usuário
 */
export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Se não existir, retorna valores padrão
      if (!data) {
        return {
          ...defaultPreferences,
          user_id: user.id,
        } as Partial<NotificationPreferences>;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook para atualizar preferências de notificação
 */
export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Tenta fazer upsert
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
    },
  });
}
