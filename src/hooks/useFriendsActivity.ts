import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFriends } from './useFriendships';

// Tipo para atividade do feed
export interface FriendActivity {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  action: 'added' | 'completed' | 'watching' | 'rated' | 'dropped';
  animeTitle: string;
  animeImage: string | null;
  rating: number | null;
  episodesWatched: number | null;
  totalEpisodes: number | null;
  timestamp: string;
}

// Hook para buscar atividades recentes dos amigos
export function useFriendsActivity() {
  const { user } = useAuth();
  const { data: friends } = useFriends();

  return useQuery({
    queryKey: ['friendsActivity', friends?.map(f => f.friend.id)],
    queryFn: async () => {
      if (!friends || friends.length === 0) return [];

      const friendIds = friends.map(f => f.friend.id);

      // Buscar entradas de anime recentes dos amigos
      const { data: entries, error } = await supabase
        .from('anime_entries')
        .select('*')
        .in('user_id', friendIds)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Mapear para formato de atividade
      const activities: FriendActivity[] = (entries || []).map(entry => {
        const friend = friends.find(f => f.friend.id === entry.user_id);
        
        // Determinar tipo de ação baseado no status
        let action: FriendActivity['action'] = 'added';
        if (entry.status === 'completed') action = 'completed';
        else if (entry.status === 'watching') action = 'watching';
        else if (entry.status === 'dropped') action = 'dropped';
        else if (entry.rating) action = 'rated';

        return {
          id: entry.id,
          userId: entry.user_id,
          username: friend?.friend.username || null,
          displayName: friend?.friend.display_name || null,
          avatarUrl: friend?.friend.avatar_url || null,
          action,
          animeTitle: entry.title,
          animeImage: entry.image_url,
          rating: entry.rating ? Number(entry.rating) : null,
          episodesWatched: entry.episodes_watched,
          totalEpisodes: entry.total_episodes,
          timestamp: entry.updated_at,
        };
      });

      return activities;
    },
    enabled: !!user && !!friends && friends.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Função utilitária para formatar tempo relativo
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return date.toLocaleDateString('pt-BR');
}

// Função para obter texto da ação
export function getActionText(action: FriendActivity['action']): string {
  const actions: Record<FriendActivity['action'], string> = {
    added: 'adicionou',
    completed: 'completou',
    watching: 'começou a assistir',
    rated: 'avaliou',
    dropped: 'abandonou',
  };
  return actions[action];
}
