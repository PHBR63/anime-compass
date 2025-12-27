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
 * Mapeamento de status para labels em português
 */
const statusLabels: Record<string, string> = {
  'not_started': 'Não Iniciado',
  'watching': 'Assistindo',
  'completed': 'Completo',
  'paused': 'Pausado',
  'dropped': 'Abandonado',
};

/**
 * Formata data para exibição no CSV
 */
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

/**
 * Escapa valor para CSV (trata aspas e vírgulas)
 */
const escapeCSV = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Se contém vírgula, aspas ou quebra de linha, envolve em aspas e escapa aspas internas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Gera CSV com BOM UTF-8 para compatibilidade com Excel
 */
const generateCSV = (headers: string[], rows: string[][]): string => {
  const BOM = '\uFEFF'; // BOM UTF-8 para Excel reconhecer caracteres especiais
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
  return `${BOM}${headerLine}\n${dataLines}`;
};

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
   * Faz download de um blob como arquivo
   */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      downloadBlob(blob, `anicheck-export-${new Date().toISOString().split('T')[0]}.json`);

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

  /**
   * Gera CSV de animes com formatação profissional
   */
  const generateAnimesCSV = (data: ExportedUserData): string => {
    const headers = [
      'Título',
      'Status',
      'Nota',
      'Episódios Assistidos',
      'Total de Episódios',
      'Progresso (%)',
      'Favorito',
      'Data de Início',
      'Data de Conclusão',
      'Notas',
      'MAL ID',
      'Adicionado em',
      'Atualizado em'
    ];

    const rows = data.animeEntries.map(entry => {
      const progress = entry.totalEpisodes 
        ? Math.round(((entry.episodesWatched || 0) / entry.totalEpisodes) * 100)
        : 0;
      
      return [
        entry.title,
        statusLabels[entry.status] || entry.status,
        entry.rating ? entry.rating.toString() : '',
        (entry.episodesWatched || 0).toString(),
        (entry.totalEpisodes || '?').toString(),
        `${progress}%`,
        entry.isFavorite ? 'Sim' : 'Não',
        formatDate(entry.startedAt),
        formatDate(entry.completedAt),
        entry.notes || '',
        entry.malId.toString(),
        formatDate(entry.createdAt),
        formatDate(entry.updatedAt)
      ];
    });

    return generateCSV(headers, rows);
  };

  /**
   * Gera CSV de listas personalizadas
   */
  const generateListsCSV = (data: ExportedUserData): string => {
    const headers = [
      'Nome da Lista',
      'Descrição',
      'Pública',
      'Quantidade de Animes',
      'Criada em',
      'Animes (separados por ;)'
    ];

    const rows = data.customLists.map(list => [
      list.name,
      list.description || '',
      list.isPublic ? 'Sim' : 'Não',
      list.items.length.toString(),
      formatDate(list.createdAt),
      list.items.map(i => i.animeTitle).join('; ')
    ]);

    return generateCSV(headers, rows);
  };

  /**
   * Gera CSV de reviews
   */
  const generateReviewsCSV = (data: ExportedUserData): string => {
    const headers = [
      'Anime',
      'Título da Review',
      'Nota',
      'Contém Spoilers',
      'Tags',
      'Curtidas',
      'Conteúdo',
      'Data',
      'MAL ID'
    ];

    const rows = data.reviews.map(review => [
      review.title,
      review.title,
      review.rating ? review.rating.toString() : '',
      review.hasSpoilers ? 'Sim' : 'Não',
      (review.tags || []).join('; '),
      (review.likesCount || 0).toString(),
      review.content,
      formatDate(review.createdAt),
      review.malId.toString()
    ]);

    return generateCSV(headers, rows);
  };

  /**
   * Gera CSV de estatísticas e perfil
   */
  const generateSummaryCSV = (data: ExportedUserData): string => {
    const headers = ['Campo', 'Valor'];
    
    const rows = [
      ['=== PERFIL ===', ''],
      ['Usuário', data.profile?.username || ''],
      ['Nome de Exibição', data.profile?.displayName || ''],
      ['Bio', data.profile?.bio || ''],
      ['Perfil Público', data.profile?.isPublic ? 'Sim' : 'Não'],
      ['Membro desde', formatDate(data.profile?.createdAt || '')],
      ['', ''],
      ['=== ESTATÍSTICAS ===', ''],
      ['Total de Animes', data.statistics.totalAnimes.toString()],
      ['Animes Completos', data.statistics.completedAnimes.toString()],
      ['Assistindo', data.statistics.watchingAnimes.toString()],
      ['Episódios Assistidos', data.statistics.totalEpisodesWatched.toString()],
      ['Total de Reviews', data.statistics.totalReviews.toString()],
      ['Total de Listas', data.statistics.totalLists.toString()],
      ['', ''],
      ['=== EXPORTAÇÃO ===', ''],
      ['Data da Exportação', formatDate(data.exportedAt)],
      ['Email', data.user.email || '']
    ];

    return generateCSV(headers, rows);
  };

  /**
   * Exporta os dados como múltiplos arquivos CSV
   */
  const exportAsCsv = async () => {
    setIsExporting(true);
    
    try {
      const data = await fetchUserData();
      if (!data) return;

      const dateStr = new Date().toISOString().split('T')[0];
      const username = data.profile?.username || 'usuario';

      // Gerar e baixar cada arquivo CSV
      const animesCSV = generateAnimesCSV(data);
      downloadBlob(
        new Blob([animesCSV], { type: 'text/csv;charset=utf-8' }),
        `anicheck-animes-${username}-${dateStr}.csv`
      );

      // Pequeno delay entre downloads para evitar bloqueio do navegador
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data.customLists.length > 0) {
        const listsCSV = generateListsCSV(data);
        downloadBlob(
          new Blob([listsCSV], { type: 'text/csv;charset=utf-8' }),
          `anicheck-listas-${username}-${dateStr}.csv`
        );
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (data.reviews.length > 0) {
        const reviewsCSV = generateReviewsCSV(data);
        downloadBlob(
          new Blob([reviewsCSV], { type: 'text/csv;charset=utf-8' }),
          `anicheck-reviews-${username}-${dateStr}.csv`
        );
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const summaryCSV = generateSummaryCSV(data);
      downloadBlob(
        new Blob([summaryCSV], { type: 'text/csv;charset=utf-8' }),
        `anicheck-resumo-${username}-${dateStr}.csv`
      );

      toast({
        title: 'Exportação CSV concluída!',
        description: `Arquivos separados gerados: Animes${data.customLists.length > 0 ? ', Listas' : ''}${data.reviews.length > 0 ? ', Reviews' : ''} e Resumo.`,
      });
    } catch (error) {
      console.error('[Export] Erro na exportação CSV:', error);
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
    exportAsCsv,
  };
}
