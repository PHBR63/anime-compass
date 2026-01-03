/**
 * Hook para sincronização automática de dados de anime em background
 * quando conectado ao WiFi. Pré-carrega dados para modo offline.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNetworkType, isGoodConnectionForPrefetch } from './useNetworkType';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { prefetchAnimesToCache } from './useAnimeWithFallback';
import { getCatalogCacheStats } from '@/lib/offlineCache';
import { toast } from 'sonner';

// Intervalo entre sincronizações (15 minutos)
const SYNC_CHECK_INTERVAL = 15 * 60 * 1000;

// Key para armazenar timestamp da última sincronização
const LAST_SYNC_KEY = 'anicheck-last-wifi-anime-sync';

// Configuração de sincronização
const SYNC_CONFIG = {
  // Máximo de animes para sincronizar por vez
  maxBatchSize: 20,
  // Intervalo mínimo entre sincronizações (em ms)
  minInterval: 10 * 60 * 1000, // 10 minutos
  // Se deve mostrar notificação ao sincronizar
  showNotification: false,
};

export interface WifiSyncStats {
  lastSync: Date | null;
  isEnabled: boolean;
  isSyncing: boolean;
  animesInCache: number;
  lastResult: {
    cached: number;
    fetched: number;
    failed: number;
  } | null;
}

/**
 * Hook que monitora a conexão e sincroniza dados de anime em WiFi
 */
export function useWifiAnimeSync() {
  const networkInfo = useNetworkType();
  const { user } = useAuth();
  const isSyncing = useRef(false);
  const [stats, setStats] = useState<WifiSyncStats>({
    lastSync: null,
    isEnabled: true,
    isSyncing: false,
    animesInCache: 0,
    lastResult: null,
  });

  /**
   * Carrega configuração do localStorage
   */
  useEffect(() => {
    const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
    const isEnabled = localStorage.getItem('anicheck-wifi-sync-enabled') !== 'false';
    
    if (lastSyncStr) {
      setStats(prev => ({
        ...prev,
        lastSync: new Date(parseInt(lastSyncStr, 10)),
        isEnabled,
      }));
    }
    
    // Carregar estatísticas do cache
    getCatalogCacheStats().then(cacheStats => {
      setStats(prev => ({
        ...prev,
        animesInCache: cacheStats.totalEntries,
      }));
    });
  }, []);

  /**
   * Verifica se deve executar sincronização
   */
  const shouldSync = useCallback((): boolean => {
    // Desabilitado pelo usuário
    if (!stats.isEnabled) return false;
    
    // Não está logado
    if (!user) return false;
    
    // Já está sincronizando
    if (isSyncing.current) return false;
    
    // Conexão não é favorável
    if (!isGoodConnectionForPrefetch(networkInfo)) return false;
    
    // Verifica intervalo mínimo entre sincronizações
    const now = Date.now();
    const lastSync = stats.lastSync?.getTime() || 0;
    
    if (now - lastSync < SYNC_CONFIG.minInterval) return false;
    
    return true;
  }, [user, networkInfo, stats.isEnabled, stats.lastSync]);

  /**
   * Executa sincronização em background
   */
  const syncInBackground = useCallback(async () => {
    if (!user || isSyncing.current) return;
    
    isSyncing.current = true;
    setStats(prev => ({ ...prev, isSyncing: true }));
    
    try {
      console.log('[WifiAnimeSync] Iniciando sincronização automática...');
      
      // Buscar todos os mal_ids da lista do usuário
      const { data: entries, error } = await supabase
        .from('anime_entries')
        .select('mal_id')
        .eq('user_id', user.id)
        .eq('is_archived', false);
      
      if (error || !entries || entries.length === 0) {
        console.log('[WifiAnimeSync] Nenhum anime para sincronizar');
        return;
      }
      
      // Extrair mal_ids únicos
      const malIds = [...new Set(
        entries
          .map(e => e.mal_id)
          .filter((id): id is number => typeof id === 'number')
      )];
      
      // Limitar tamanho do lote
      const batchToSync = malIds.slice(0, SYNC_CONFIG.maxBatchSize);
      
      console.log(`[WifiAnimeSync] Sincronizando ${batchToSync.length}/${malIds.length} animes...`);
      
      // Executar prefetch
      const result = await prefetchAnimesToCache(batchToSync);
      
      // Atualizar estatísticas
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, now.toString());
      
      const cacheStats = await getCatalogCacheStats();
      
      setStats(prev => ({
        ...prev,
        lastSync: new Date(now),
        lastResult: result,
        animesInCache: cacheStats.totalEntries,
      }));
      
      console.log(`[WifiAnimeSync] Concluído: ${result.cached} em cache, ${result.fetched} baixados, ${result.failed} falhas`);
      
      // Notificação opcional
      if (SYNC_CONFIG.showNotification && result.fetched > 0) {
        toast.success(`${result.fetched} animes sincronizados para offline`, {
          duration: 3000,
        });
      }
      
    } catch (error) {
      console.warn('[WifiAnimeSync] Erro na sincronização:', error);
    } finally {
      isSyncing.current = false;
      setStats(prev => ({ ...prev, isSyncing: false }));
    }
  }, [user]);

  /**
   * Habilita/desabilita sincronização automática
   */
  const toggleEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem('anicheck-wifi-sync-enabled', enabled ? 'true' : 'false');
    setStats(prev => ({ ...prev, isEnabled: enabled }));
    
    if (enabled) {
      toast.success('Sincronização automática ativada');
    } else {
      toast.info('Sincronização automática desativada');
    }
  }, []);

  /**
   * Força sincronização manual
   */
  const forceSync = useCallback(async () => {
    if (isSyncing.current) return;
    
    if (!networkInfo.isOnline) {
      toast.error('Sem conexão com a internet');
      return;
    }
    
    await syncInBackground();
  }, [networkInfo.isOnline, syncInBackground]);

  /**
   * Efeito que monitora mudanças na conexão
   */
  useEffect(() => {
    // Sincroniza quando conecta ao WiFi
    if (shouldSync()) {
      // Delay para garantir estabilidade da conexão
      const timeout = setTimeout(() => {
        syncInBackground();
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [networkInfo.type, networkInfo.isOnline, shouldSync, syncInBackground]);

  /**
   * Verificação periódica em background
   */
  useEffect(() => {
    if (!user || !stats.isEnabled) return;
    
    const interval = setInterval(() => {
      if (shouldSync()) {
        syncInBackground();
      }
    }, SYNC_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [user, stats.isEnabled, shouldSync, syncInBackground]);

  return {
    stats,
    networkInfo,
    isWifi: networkInfo.isWifi,
    isSyncing: stats.isSyncing,
    toggleEnabled,
    forceSync,
  };
}
