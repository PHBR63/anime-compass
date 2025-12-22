import { supabase } from '@/integrations/supabase/client';
import {
  getLastSyncTime,
  addCachedEntry,
  updateCachedEntry,
  removeCachedEntry,
  cacheUserStats,
} from './offlineCache';

/**
 * Interface para resultado da sincronização incremental
 */
export interface IncrementalSyncResult {
  added: number;
  updated: number;
  deleted: number;
  errors: number;
}

/**
 * Realiza sincronização incremental - busca apenas dados modificados
 * desde a última sincronização
 */
export async function incrementalSync(userId: string): Promise<IncrementalSyncResult> {
  const result: IncrementalSyncResult = {
    added: 0,
    updated: 0,
    deleted: 0,
    errors: 0,
  };

  try {
    // Obtém timestamp da última sincronização
    const lastSync = await getLastSyncTime(userId);
    
    // Se nunca sincronizou, faz sync completo
    if (!lastSync) {
      console.log('[IncrementalSync] Nenhuma sincronização anterior, pulando incremental');
      return result;
    }

    const lastSyncDate = new Date(lastSync).toISOString();
    console.log(`[IncrementalSync] Buscando alterações desde ${lastSyncDate}`);

    // Busca entries modificadas após a última sincronização
    const { data: modifiedEntries, error: entriesError } = await supabase
      .from('anime_entries')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSyncDate)
      .order('updated_at', { ascending: true });

    if (entriesError) {
      console.error('[IncrementalSync] Erro ao buscar entries:', entriesError);
      result.errors++;
    } else if (modifiedEntries && modifiedEntries.length > 0) {
      console.log(`[IncrementalSync] ${modifiedEntries.length} entries modificadas encontradas`);

      // Atualiza cache incrementalmente
      for (const entry of modifiedEntries) {
        try {
          // Se está arquivado, remove do cache
          if (entry.is_archived) {
            await removeCachedEntry(entry.id);
            result.deleted++;
          } else {
            // Verifica se é nova ou atualização
            // Tenta atualizar primeiro, se não existir, adiciona
            await updateCachedEntry(entry.id, entry);
            result.updated++;
          }
        } catch (cacheError) {
          // Se falhou update, tenta adicionar como nova
          try {
            await addCachedEntry(entry);
            result.added++;
          } catch {
            console.error('[IncrementalSync] Erro ao cachear entry:', entry.id);
            result.errors++;
          }
        }
      }
    }

    // Atualiza estatísticas do usuário
    await syncUserStats(userId);

    console.log(`[IncrementalSync] Concluído: +${result.added} ~${result.updated} -${result.deleted}`);
    return result;
  } catch (error) {
    console.error('[IncrementalSync] Erro geral:', error);
    result.errors++;
    return result;
  }
}

/**
 * Sincroniza estatísticas do usuário
 */
async function syncUserStats(userId: string): Promise<void> {
  try {
    const { data: entries, error } = await supabase
      .from('anime_entries')
      .select('status, episodes_watched, rating')
      .eq('user_id', userId)
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

    await cacheUserStats(stats, userId);
  } catch (error) {
    console.error('[IncrementalSync] Erro ao sincronizar stats:', error);
  }
}

/**
 * Verifica se há atualizações disponíveis no servidor
 * Retorna true se há dados mais recentes que o cache
 */
export async function hasServerUpdates(userId: string): Promise<boolean> {
  try {
    const lastSync = await getLastSyncTime(userId);
    if (!lastSync) return true;

    const lastSyncDate = new Date(lastSync).toISOString();

    // Conta quantos registros foram modificados
    const { count, error } = await supabase
      .from('anime_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('updated_at', lastSyncDate);

    if (error) {
      console.error('[IncrementalSync] Erro ao verificar updates:', error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
