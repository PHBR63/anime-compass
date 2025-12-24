import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Interface para os dados exportados
 */
export interface ExportedUserData {
  exportedAt: string;
  user: {
    id: string;
    email: string | undefined;
  };
  profile: {
    username: string | null;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    isPublic: boolean | null;
    createdAt: string;
  } | null;
  animeEntries: Array<{
    malId: number;
    title: string;
    status: string;
    rating: number | null;
    episodesWatched: number | null;
    totalEpisodes: number | null;
    notes: string | null;
    isFavorite: boolean | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  customLists: Array<{
    name: string;
    description: string | null;
    isPublic: boolean | null;
    createdAt: string;
    items: Array<{
      animeTitle: string;
      malId: number;
      position: number | null;
    }>;
  }>;
  reviews: Array<{
    malId: number;
    title: string;
    content: string;
    rating: number | null;
    hasSpoilers: boolean | null;
    tags: string[] | null;
    likesCount: number | null;
    createdAt: string;
  }>;
  statistics: {
    totalAnimes: number;
    completedAnimes: number;
    watchingAnimes: number;
    totalEpisodesWatched: number;
    totalReviews: number;
    totalLists: number;
  };
}

/**
 * Hook para exportar dados do usuário
 */
export function useExportUserData() {
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  /**
   * Busca e compila todos os dados do usuário
   */
  const fetchUserData = async (): Promise<ExportedUserData | null> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para exportar seus dados.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Buscar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Buscar anime entries
      const { data: animeEntries, error: animeError } = await supabase
        .from('anime_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (animeError) throw animeError;

      // Buscar custom lists com items
      const { data: customLists, error: listsError } = await supabase
        .from('custom_lists')
        .select(`
          *,
          list_items (
            position,
            anime_entry:anime_entries (
              title,
              mal_id
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Buscar reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Calcular estatísticas
      const totalAnimes = animeEntries?.length || 0;
      const completedAnimes = animeEntries?.filter(a => a.status === 'completed').length || 0;
      const watchingAnimes = animeEntries?.filter(a => a.status === 'watching').length || 0;
      const totalEpisodesWatched = animeEntries?.reduce((acc, a) => acc + (a.episodes_watched || 0), 0) || 0;

      // Montar objeto de exportação
      const exportData: ExportedUserData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        profile: profile ? {
          username: profile.username,
          displayName: profile.display_name,
          bio: profile.bio,
          avatarUrl: profile.avatar_url,
          bannerUrl: profile.banner_url,
          isPublic: profile.is_public,
          createdAt: profile.created_at,
        } : null,
        animeEntries: (animeEntries || []).map(entry => ({
          malId: entry.mal_id,
          title: entry.title,
          status: entry.status,
          rating: entry.rating,
          episodesWatched: entry.episodes_watched,
          totalEpisodes: entry.total_episodes,
          notes: entry.notes,
          isFavorite: entry.is_favorite,
          startedAt: entry.started_at,
          completedAt: entry.completed_at,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
        })),
        customLists: (customLists || []).map(list => ({
          name: list.name,
          description: list.description,
          isPublic: list.is_public,
          createdAt: list.created_at,
          items: (list.list_items || []).map((item: any) => ({
            animeTitle: item.anime_entry?.title || 'Desconhecido',
            malId: item.anime_entry?.mal_id || 0,
            position: item.position,
          })),
        })),
        reviews: (reviews || []).map(review => ({
          malId: review.mal_id,
          title: review.title,
          content: review.content,
          rating: review.rating,
          hasSpoilers: review.has_spoilers,
          tags: review.tags,
          likesCount: review.likes_count,
          createdAt: review.created_at,
        })),
        statistics: {
          totalAnimes,
          completedAnimes,
          watchingAnimes,
          totalEpisodesWatched,
          totalReviews: reviews?.length || 0,
          totalLists: customLists?.length || 0,
        },
      };

      return exportData;
    } catch (error) {
      console.error('[Export] Erro ao buscar dados:', error);
      throw error;
    }
  };

  /**
   * Exporta os dados como arquivo JSON
   */
  const exportAsJson = async () => {
    setIsExporting(true);
    
    try {
      const data = await fetchUserData();
      if (!data) return;

      // Criar blob e baixar
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `anicheck-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída!',
        description: `${data.statistics.totalAnimes} animes, ${data.statistics.totalLists} listas e ${data.statistics.totalReviews} reviews exportados.`,
      });
    } catch (error) {
      console.error('[Export] Erro na exportação:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar seus dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportAsJson,
  };
}
