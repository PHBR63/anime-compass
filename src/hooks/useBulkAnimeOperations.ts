import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

/**
 * Hook para atualizar status de múltiplos animes em massa
 */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: AnimeStatus }) => {
      // Se o status for "completed", buscar os animes para atualizar episódios
      if (status === 'completed') {
        // Buscar total de episódios de cada anime
        const { data: entries, error: fetchError } = await supabase
          .from('anime_entries')
          .select('id, total_episodes')
          .in('id', ids);

        if (fetchError) throw fetchError;

        // Atualizar cada anime individualmente com episódios completos
        for (const entry of entries || []) {
          const { error } = await supabase
            .from('anime_entries')
            .update({ 
              status, 
              episodes_watched: entry.total_episodes || 0,
              completed_at: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString() 
            })
            .eq('id', entry.id);

          if (error) throw error;
        }
      } else {
        // Para outros status, atualização normal em lote
        const { error } = await supabase
          .from('anime_entries')
          .update({ status, updated_at: new Date().toISOString() })
          .in('id', ids);

        if (error) throw error;
      }
      
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      toast.success(`${count} anime(s) atualizados`);
    },
    onError: () => {
      toast.error('Erro ao atualizar animes');
    },
  });
}

/**
 * Hook para atualizar nota de múltiplos animes em massa
 */
export function useBulkUpdateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, rating }: { ids: string[]; rating: number }) => {
      const { error } = await supabase
        .from('anime_entries')
        .update({ rating, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      toast.success(`Nota aplicada a ${count} anime(s)`);
    },
    onError: () => {
      toast.error('Erro ao aplicar nota');
    },
  });
}

/**
 * Hook para favoritar/desfavoritar múltiplos animes em massa
 */
export function useBulkToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, isFavorite }: { ids: string[]; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('anime_entries')
        .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, { isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      toast.success(`${count} anime(s) ${isFavorite ? 'favoritados' : 'removidos dos favoritos'}`);
    },
    onError: () => {
      toast.error('Erro ao atualizar favoritos');
    },
  });
}

/**
 * Hook para arquivar/desarquivar múltiplos animes em massa
 */
export function useBulkArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, isArchived }: { ids: string[]; isArchived: boolean }) => {
      const { error } = await supabase
        .from('anime_entries')
        .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, { isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      toast.success(`${count} anime(s) ${isArchived ? 'arquivados' : 'desarquivados'}`);
    },
    onError: () => {
      toast.error('Erro ao arquivar animes');
    },
  });
}

/**
 * Hook para deletar múltiplos animes em massa
 */
export function useBulkDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('anime_entries')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      toast.success(`${count} anime(s) removidos`);
    },
    onError: () => {
      toast.error('Erro ao remover animes');
    },
  });
}

/**
 * Hook para adicionar múltiplos animes a uma lista
 */
export function useBulkAddToList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ animeIds, listId }: { animeIds: string[]; listId: string }) => {
      // Buscar posição máxima atual da lista
      const { data: existingItems } = await supabase
        .from('list_items')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1);

      const startPosition = existingItems?.[0]?.position ?? 0;

      // Inserir novos itens
      const items = animeIds.map((animeId, index) => ({
        list_id: listId,
        anime_entry_id: animeId,
        position: startPosition + index + 1,
      }));

      const { error } = await supabase.from('list_items').insert(items);

      if (error) throw error;
      return animeIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      queryClient.invalidateQueries({ queryKey: ['list-items'] });
      toast.success(`${count} anime(s) adicionados à lista`);
    },
    onError: () => {
      toast.error('Erro ao adicionar à lista');
    },
  });
}
