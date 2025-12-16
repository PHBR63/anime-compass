import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type FriendshipStatus = Database['public']['Enums']['friendship_status'];

// Tipo para amizade com dados do perfil
export interface FriendshipWithProfile {
  id: string;
  status: FriendshipStatus;
  created_at: string;
  requester_id: string;
  addressee_id: string;
  friend: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  isRequester: boolean;
}

// Hook para buscar amigos aceitos
export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar amizades aceitas onde o usuário é requester ou addressee
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      // Buscar perfis dos amigos
      const friendIds = friendships?.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) || [];

      if (friendIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      // Combinar dados
      return friendships?.map(f => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const friend = profiles?.find(p => p.id === friendId);
        return {
          ...f,
          friend: friend || { id: friendId, username: null, display_name: null, avatar_url: null, bio: null },
          isRequester: f.requester_id === user.id,
        } as FriendshipWithProfile;
      }) || [];
    },
    enabled: !!user,
  });
}

// Hook para buscar pedidos de amizade pendentes
export function usePendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friendRequests', 'pending', user?.id],
    queryFn: async () => {
      if (!user) return { received: [], sent: [] };

      // Pedidos recebidos
      const { data: received, error: receivedError } = await supabase
        .from('friendships')
        .select('*')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      // Pedidos enviados
      const { data: sent, error: sentError } = await supabase
        .from('friendships')
        .select('*')
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      // Buscar perfis
      const allIds = [
        ...(received?.map(r => r.requester_id) || []),
        ...(sent?.map(s => s.addressee_id) || [])
      ];

      if (allIds.length === 0) return { received: [], sent: [] };

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', allIds);

      const mapWithProfile = (items: any[], friendKey: string) =>
        items?.map(item => ({
          ...item,
          friend: profiles?.find(p => p.id === item[friendKey]) || { id: item[friendKey] },
          isRequester: item.requester_id === user.id,
        })) || [];

      return {
        received: mapWithProfile(received || [], 'requester_id'),
        sent: mapWithProfile(sent || [], 'addressee_id'),
      };
    },
    enabled: !!user,
  });
}

// Hook para buscar usuários por nome/username
export function useSearchUsers(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: async () => {
      if (!user || query.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .neq('id', user.id)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && query.length >= 2,
  });
}

// Hook para enviar pedido de amizade
export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
    },
  });
}

// Hook para responder pedido de amizade
export function useRespondToRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      friendshipId, 
      accept 
    }: { 
      friendshipId: string; 
      accept: boolean;
    }) => {
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', friendshipId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

// Hook para remover amizade
export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

// Hook para buscar contagem de animes de um usuário
export function useFriendAnimeCount(userId: string) {
  return useQuery({
    queryKey: ['friendAnimeCount', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('anime_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
}
