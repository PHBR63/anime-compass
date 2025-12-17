import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Interface para recomendação de anime
export interface AnimeRecommendation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  mal_id: number;
  anime_title: string;
  anime_image: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'watched';
  created_at: string;
  watched_at: string | null;
  from_user?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  to_user?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Hook para buscar recomendações recebidas
export function useReceivedRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recommendations', 'received', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('anime_recommendations')
        .select('*')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis dos remetentes
      const fromUserIds = [...new Set(data.map(r => r.from_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', fromUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(rec => ({
        ...rec,
        from_user: profileMap.get(rec.from_user_id)
      })) as AnimeRecommendation[];
    },
    enabled: !!user,
  });
}

// Hook para buscar recomendações enviadas
export function useSentRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recommendations', 'sent', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('anime_recommendations')
        .select('*')
        .eq('from_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis dos destinatários
      const toUserIds = [...new Set(data.map(r => r.to_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', toUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(rec => ({
        ...rec,
        to_user: profileMap.get(rec.to_user_id)
      })) as AnimeRecommendation[];
    },
    enabled: !!user,
  });
}

// Hook para enviar recomendação
export function useSendRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      to_user_id: string;
      mal_id: number;
      anime_title: string;
      anime_image?: string;
      message?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('anime_recommendations')
        .insert({
          from_user_id: user.id,
          ...data
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success('Recomendação enviada!');
    },
    onError: () => {
      toast.error('Erro ao enviar recomendação');
    },
  });
}

// Hook para responder a recomendação
export function useRespondToRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'watched' }) => {
      const updates: { status: string; watched_at?: string } = { status };
      if (status === 'watched') {
        updates.watched_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('anime_recommendations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success(status === 'accepted' ? 'Recomendação aceita!' : 'Marcado como assistido!');
    },
    onError: () => {
      toast.error('Erro ao atualizar recomendação');
    },
  });
}

// Hook para contar recomendações pendentes
export function usePendingRecommendationsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recommendations', 'pending-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('anime_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}
