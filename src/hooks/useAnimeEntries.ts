import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeEntryInsert = Database['public']['Tables']['anime_entries']['Insert'];
type AnimeEntryUpdate = Database['public']['Tables']['anime_entries']['Update'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

export function useAnimeEntries(status?: AnimeStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['anime-entries', user?.id, status],
    queryFn: async () => {
      if (!user) return [];
      
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
      return data as AnimeEntry[];
    },
    enabled: !!user,
  });
}

export function useAddAnimeEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<AnimeEntryInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('anime_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Anime adicionado à lista!');
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

export function useUpdateAnimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AnimeEntryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('anime_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar anime');
    },
  });
}

export function useDeleteAnimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('anime_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Anime removido da lista');
    },
    onError: () => {
      toast.error('Erro ao remover anime');
    },
  });
}

export function useUserStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

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

      return stats;
    },
    enabled: !!user,
  });
}
