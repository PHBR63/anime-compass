import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CustomList {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  anime_entry_id: string;
  position: number;
  created_at: string;
}

export interface CreateListInput {
  name: string;
  description?: string;
  cover_url?: string;
  is_public?: boolean;
}

export interface SmartListCriteria {
  genres?: string[];
  status?: string[];
  minRating?: number;
  maxRating?: number;
  isFavorite?: boolean;
}

/**
 * Hook para buscar todas as listas do usuário
 */
export function useCustomLists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['custom-lists', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('custom_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomList[];
    },
    enabled: !!user,
  });
}

/**
 * Hook para buscar itens de uma lista específica
 */
export function useListItems(listId: string | null) {
  return useQuery({
    queryKey: ['list-items', listId],
    queryFn: async () => {
      if (!listId) return [];

      const { data, error } = await supabase
        .from('list_items')
        .select(`
          *,
          anime_entry:anime_entries(*)
        `)
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });
}

/**
 * Hook para criar uma nova lista
 */
export function useCreateList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateListInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('custom_lists')
        .insert({
          name: input.name,
          description: input.description || null,
          cover_url: input.cover_url || null,
          is_public: input.is_public ?? false,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      toast.success('Lista criada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar lista');
    },
  });
}

/**
 * Hook para atualizar uma lista
 */
export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomList> & { id: string }) => {
      const { data, error } = await supabase
        .from('custom_lists')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      toast.success('Lista atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar lista');
    },
  });
}

/**
 * Hook para deletar uma lista
 */
export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('custom_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
      return listId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      toast.success('Lista removida');
    },
    onError: () => {
      toast.error('Erro ao remover lista');
    },
  });
}

/**
 * Hook para adicionar anime a uma lista
 */
export function useAddToList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, animeEntryId }: { listId: string; animeEntryId: string }) => {
      // Buscar posição máxima
      const { data: existingItems } = await supabase
        .from('list_items')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1);

      const position = (existingItems?.[0]?.position ?? 0) + 1;

      const { error } = await supabase.from('list_items').insert({
        list_id: listId,
        anime_entry_id: animeEntryId,
        position,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items'] });
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      toast.success('Anime adicionado à lista');
    },
    onError: () => {
      toast.error('Erro ao adicionar anime');
    },
  });
}

/**
 * Hook para remover anime de uma lista
 */
export function useRemoveFromList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, animeEntryId }: { listId: string; animeEntryId: string }) => {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId)
        .eq('anime_entry_id', animeEntryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items'] });
      toast.success('Anime removido da lista');
    },
    onError: () => {
      toast.error('Erro ao remover anime');
    },
  });
}

/**
 * Hook para contar itens de uma lista
 */
export function useListItemCount(listId: string) {
  return useQuery({
    queryKey: ['list-item-count', listId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!listId,
  });
}
