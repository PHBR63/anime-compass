import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Interface para reação de atividade
export interface ActivityReaction {
  id: string;
  user_id: string;
  anime_entry_id: string;
  reaction_type: string;
  created_at: string;
}

// Hook para buscar reações de uma entrada de anime
export function useEntryReactions(animeEntryId: string) {
  return useQuery({
    queryKey: ['reactions', animeEntryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_reactions')
        .select('*')
        .eq('anime_entry_id', animeEntryId);

      if (error) throw error;
      return data as ActivityReaction[];
    },
    enabled: !!animeEntryId,
  });
}

// Hook para buscar reações de múltiplas entradas
export function useMultipleEntriesReactions(entryIds: string[]) {
  return useQuery({
    queryKey: ['reactions', 'multiple', entryIds],
    queryFn: async () => {
      if (entryIds.length === 0) return {};

      const { data, error } = await supabase
        .from('activity_reactions')
        .select('*')
        .in('anime_entry_id', entryIds);

      if (error) throw error;

      // Agrupar reações por entrada
      const grouped: Record<string, ActivityReaction[]> = {};
      data?.forEach(reaction => {
        if (!grouped[reaction.anime_entry_id]) {
          grouped[reaction.anime_entry_id] = [];
        }
        grouped[reaction.anime_entry_id].push(reaction as ActivityReaction);
      });

      return grouped;
    },
    enabled: entryIds.length > 0,
  });
}

// Hook para toggle de reação (like/unlike)
export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ animeEntryId, reactionType = 'like' }: { animeEntryId: string; reactionType?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Verificar se já existe reação
      const { data: existing } = await supabase
        .from('activity_reactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('anime_entry_id', animeEntryId)
        .maybeSingle();

      if (existing) {
        // Remover reação existente
        const { error } = await supabase
          .from('activity_reactions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Adicionar nova reação
        const { error } = await supabase
          .from('activity_reactions')
          .insert({
            user_id: user.id,
            anime_entry_id: animeEntryId,
            reaction_type: reactionType
          });

        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
      queryClient.invalidateQueries({ queryKey: ['friendsActivity'] });
    },
    onError: () => {
      toast.error('Erro ao reagir');
    },
  });
}

// Hook para verificar se usuário reagiu a uma entrada
export function useUserReaction(animeEntryId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reactions', 'user', animeEntryId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('activity_reactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('anime_entry_id', animeEntryId)
        .maybeSingle();

      if (error) throw error;
      return data as ActivityReaction | null;
    },
    enabled: !!user && !!animeEntryId,
  });
}

// Hook para contar total de likes recebidos pelo usuário
export function useTotalLikesReceived() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reactions', 'total-received', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Primeiro buscar IDs das entradas do usuário
      const { data: entries } = await supabase
        .from('anime_entries')
        .select('id')
        .eq('user_id', user.id);

      if (!entries || entries.length === 0) return 0;

      const entryIds = entries.map(e => e.id);

      // Contar reações nessas entradas
      const { count, error } = await supabase
        .from('activity_reactions')
        .select('*', { count: 'exact', head: true })
        .in('anime_entry_id', entryIds);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}
