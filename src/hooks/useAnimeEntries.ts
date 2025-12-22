import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useOnlineStatus } from './useOnlineStatus';
import { addToQueue } from '@/lib/offlineQueue';
import {
  cacheAnimeEntries,
  getCachedAnimeEntries,
  addCachedEntry,
  updateCachedEntry,
  removeCachedEntry,
  cacheUserStats,
  getCachedUserStats,
} from '@/lib/offlineCache';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeEntryInsert = Database['public']['Tables']['anime_entries']['Insert'];
type AnimeEntryUpdate = Database['public']['Tables']['anime_entries']['Update'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

/**
 * Hook para buscar anime entries com suporte a cache offline
 * Quando online: busca do servidor e atualiza cache
 * Quando offline: retorna dados do cache IndexedDB
 */
export function useAnimeEntries(status?: AnimeStatus) {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useQuery({
    queryKey: ['anime-entries', user?.id, status],
    queryFn: async () => {
      if (!user) return [];

      // Se offline, busca do cache
      if (!isOnline) {
        const cached = await getCachedAnimeEntries(user.id, status);
        if (cached.length > 0) {
          return cached as AnimeEntry[];
        }
        // Se não tem cache, lança erro
        throw new Error('Sem conexão e sem dados em cache');
      }

      // Online: busca do servidor
      let query = supabase
        .from('anime_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Atualiza o cache em background (apenas se buscou sem filtro de status)
      if (!status && data) {
        cacheAnimeEntries(data, user.id).catch(console.error);
      }

      return data as AnimeEntry[];
    },
    enabled: !!user,
    // Permite retornar dados stale quando offline
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
  });
}

/**
 * Hook para adicionar anime à lista com suporte offline
 * Se offline, adiciona à fila de sincronização
 */
export function useAddAnimeEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async (entry: Omit<AnimeEntryInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Se offline, adiciona à fila
      if (!isOnline) {
        await addToQueue('add-anime', { ...entry, user_id: user.id }, user.id);
        // Retorna dados simulados para atualização otimista
        return {
          ...entry,
          id: `temp-${Date.now()}`,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AnimeEntry;
      }
      
      const { data, error } = await supabase
        .from('anime_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Adiciona ao cache local
      if (data) {
        addCachedEntry(data).catch(console.error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      if (isOnline) {
        toast.success('Anime adicionado à lista!');
      } else {
        toast.success('Anime salvo offline! Será sincronizado quando voltar online.');
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('Este anime já está na sua lista');
      } else {
        toast.error('Erro ao adicionar anime');
      }
    },
  });
}

/**
 * Hook para atualizar anime com suporte offline
 * Se offline, adiciona à fila de sincronização
 */
export function useUpdateAnimeEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AnimeEntryUpdate & { id: string }) => {
      // Se offline, adiciona à fila
      if (!isOnline && user) {
        await addToQueue('update-anime', { id, ...updates }, user.id);
        // Retorna dados simulados
        return { id, ...updates } as AnimeEntry;
      }
      
      const { data, error } = await supabase
        .from('anime_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Atualiza o cache local
      if (variables.id) {
        updateCachedEntry(variables.id, variables).catch(console.error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      if (!isOnline) {
        toast.info('Alteração salva offline');
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar anime');
    },
  });
}

/**
 * Hook para deletar anime com suporte offline
 * Se offline, adiciona à fila de sincronização
 */
export function useDeleteAnimeEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async (id: string) => {
      // Se offline, adiciona à fila
      if (!isOnline && user) {
        await addToQueue('delete-anime', { id }, user.id);
        return;
      }
      
      const { error } = await supabase
        .from('anime_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      // Remove do cache local
      removeCachedEntry(id).catch(console.error);
      
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      if (isOnline) {
        toast.success('Anime removido da lista');
      } else {
        toast.success('Remoção salva offline');
      }
    },
    onError: () => {
      toast.error('Erro ao remover anime');
    },
  });
}

/**
 * Hook para estatísticas do usuário com suporte a cache offline
 */
export function useUserStats() {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Se offline, busca do cache
      if (!isOnline) {
        const cached = await getCachedUserStats(user.id);
        if (cached) {
          return cached as {
            totalAnimes: number;
            watching: number;
            completed: number;
            paused: number;
            dropped: number;
            notStarted: number;
            totalEpisodes: number;
            averageRating: string;
            completionRate: string;
          };
        }
      }

      const { data: entries, error } = await supabase
        .from('anime_entries')
        .select('status, episodes_watched, rating')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (error) throw error;

      const stats = {
        totalAnimes: entries?.length || 0,
        watching: entries?.filter(e => e.status === 'watching').length || 0,
        completed: entries?.filter(e => e.status === 'completed').length || 0,
        paused: entries?.filter(e => e.status === 'paused').length || 0,
        dropped: entries?.filter(e => e.status === 'dropped').length || 0,
        notStarted: entries?.filter(e => e.status === 'not_started').length || 0,
        totalEpisodes: entries?.reduce((sum, e) => sum + (e.episodes_watched || 0), 0) || 0,
        averageRating: entries?.filter(e => e.rating).length 
          ? (entries.filter(e => e.rating).reduce((sum, e) => sum + (Number(e.rating) || 0), 0) / entries.filter(e => e.rating).length).toFixed(1)
          : '0.0',
        completionRate: entries?.length 
          ? ((entries.filter(e => e.status === 'completed').length / entries.length) * 100).toFixed(0)
          : '0',
      };

      // Salva no cache em background
      cacheUserStats(stats, user.id).catch(console.error);

      return stats;
    },
    enabled: !!user,
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
  });
}
