import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook para fixar/desafixar conversas
 * Permite ao usuário marcar conversas como importantes para aparecerem no topo da lista
 */
export function usePinConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, isPinned }: { conversationId: string; isPinned: boolean }) => {
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('conversation_participants')
        .update({ 
          is_pinned: isPinned,
          pinned_at: isPinned ? new Date().toISOString() : null,
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar cache de conversas para reordenar a lista
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
