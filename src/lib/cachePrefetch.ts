import { supabase } from '@/integrations/supabase/client';
import { cacheAnimeEntries, cacheUserStats } from './offlineCache';
import { prefetchImages } from './imageCache';

/**
 * Pré-carrega dados do usuário para o cache offline
 * Deve ser chamado após login bem-sucedido
 */
export async function prefetchUserData(userId: string): Promise<void> {
  try {
    console.log('[Cache] Iniciando pré-carregamento de dados offline...');

    // Busca anime entries em paralelo com outras queries
    const [entriesResult, statsResult] = await Promise.allSettled([
      // Busca todas as anime entries do usuário
      supabase
        .from('anime_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false }),
      
      // Busca dados para calcular estatísticas
      supabase
        .from('anime_entries')
        .select('status, episodes_watched, rating')
        .eq('user_id', userId)
        .eq('is_archived', false),
    ]);

    // Processa anime entries
    if (entriesResult.status === 'fulfilled' && entriesResult.value.data) {
      const entries = entriesResult.value.data;
      await cacheAnimeEntries(entries, userId);
      console.log(`[Cache] ${entries.length} anime entries em cache`);
      
      // Pré-carrega imagens das primeiras 50 entries em background
      const imageUrls = entries
        .slice(0, 50)
        .map(e => e.image_url)
        .filter((url): url is string => !!url);
      
      if (imageUrls.length > 0) {
        // Não aguarda - executa em background
        prefetchImages(imageUrls).then(() => {
          console.log(`[Cache] ${imageUrls.length} imagens pré-carregadas`);
        });
      }
    }

    // Processa estatísticas
    if (statsResult.status === 'fulfilled' && statsResult.value.data) {
      const entries = statsResult.value.data;
      const stats = {
        totalAnimes: entries.length,
        watching: entries.filter(e => e.status === 'watching').length,
        completed: entries.filter(e => e.status === 'completed').length,
        paused: entries.filter(e => e.status === 'paused').length,
        dropped: entries.filter(e => e.status === 'dropped').length,
        notStarted: entries.filter(e => e.status === 'not_started').length,
        totalEpisodes: entries.reduce((sum, e) => sum + (e.episodes_watched || 0), 0),
        averageRating: entries.filter(e => e.rating).length
          ? (entries.filter(e => e.rating).reduce((sum, e) => sum + (Number(e.rating) || 0), 0) / entries.filter(e => e.rating).length).toFixed(1)
          : '0.0',
        completionRate: entries.length
          ? ((entries.filter(e => e.status === 'completed').length / entries.length) * 100).toFixed(0)
          : '0',
      };
      
      await cacheUserStats(stats, userId);
      console.log('[Cache] Estatísticas do usuário em cache');
    }

    console.log('[Cache] Pré-carregamento concluído com sucesso!');
  } catch (error) {
    console.error('[Cache] Erro no pré-carregamento:', error);
    // Não lança erro para não interromper o fluxo de login
  }
}

/**
 * Verifica se o cache precisa ser atualizado
 * Retorna true se o cache estiver vazio ou muito antigo (> 1 hora)
 */
export async function shouldRefreshCache(userId: string): Promise<boolean> {
  try {
    const { getLastSyncTime } = await import('./offlineCache');
    const lastSync = await getLastSyncTime(userId);
    
    if (!lastSync) return true;
    
    // Atualiza se cache tiver mais de 1 hora
    const oneHour = 60 * 60 * 1000;
    return Date.now() - lastSync > oneHour;
  } catch {
    return true;
  }
}
