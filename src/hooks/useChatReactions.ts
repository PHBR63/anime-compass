import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Tipos de reação disponíveis
export const REACTION_TYPES = {
  like: '👍',
  heart: '❤️',
  fire: '🔥',
  laugh: '😂',
  sad: '😢',
  wow: '😮',
} as const;

export type ReactionType = keyof typeof REACTION_TYPES;

// Interface para reação com contagem
export interface MessageReaction {
  reaction_type: ReactionType;
  count: number;
  has_reacted: boolean;
}

// Hook para buscar reações de uma mensagem
export function useMessageReactions(messageId: string) {
  const { user } = useAuth();

  // Evita consultas inválidas quando a mensagem ainda é otimista (id temporário)
  const isTempId = messageId?.startsWith('temp-');

  return useQuery({
    queryKey: ['messageReactions', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_message_reactions')
        .select('reaction_type, user_id')
        .eq('message_id', messageId);

      if (error) throw error;

      // Agrupar por tipo de reação
      const reactionMap = new Map<ReactionType, { count: number; has_reacted: boolean }>();

      data?.forEach(r => {
        const type = r.reaction_type as ReactionType;
        const existing = reactionMap.get(type) || { count: 0, has_reacted: false };
        reactionMap.set(type, {
          count: existing.count + 1,
          has_reacted: existing.has_reacted || r.user_id === user?.id,
        });
      });

      return Array.from(reactionMap.entries()).map(([type, data]) => ({
        reaction_type: type,
        ...data,
      })) as MessageReaction[];
    },
    enabled: !!messageId && !!user && !isTempId,
  });
}

// Hook para adicionar/remover reação
export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      messageId,
      reactionType,
    }: {
      messageId: string;
      reactionType: ReactionType;
    }) => {
      if (!user) throw new Error('Não autenticado');

      // Evita tentar reagir em mensagens ainda não persistidas (id temporário)
      if (messageId.startsWith('temp-')) {
        throw new Error('Mensagem ainda está sendo enviada');
      }

      // Verificar se já existe
      const { data: existing, error: existingError } = await supabase
        .from('chat_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        // Remover reação
        const { error } = await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'removed' as const };
      }

      // Adicionar reação
      const { error } = await supabase
        .from('chat_message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType,
        });

      if (error) throw error;
      return { action: 'added' as const };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messageReactions', variables.messageId] });
    },
  });
}
