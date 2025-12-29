import { useEffect, useRef, useCallback, useState } from 'react';
import { useNetworkType, isGoodConnectionForPrefetch } from './useNetworkType';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { prefetchImages, getImageCacheStats } from '@/lib/imageCache';

// Intervalo entre verificações de pré-carregamento (5 minutos)
const PREFETCH_CHECK_INTERVAL = 5 * 60 * 1000;

// Máximo de imagens para pré-carregar por lote
const BATCH_SIZE = 10;

// Key para armazenar timestamp do último prefetch
const LAST_PREFETCH_KEY = 'anicheck-last-wifi-prefetch';

// Limite de imagens no cache (para não usar muito espaço)
const MAX_CACHE_SIZE = 500;

/**
 * Hook que monitora a conexão e pré-carrega imagens automaticamente em WiFi
 * Usa proxy para contornar problemas de CORS
 * Executa em background sem bloquear a interface
 */
export function useWifiImagePrefetch() {
  const networkInfo = useNetworkType();
  const { user } = useAuth();
  const isPrefetching = useRef(false);
  const lastPrefetchTime = useRef<number>(0);
  const [prefetchStats, setPrefetchStats] = useState({ success: 0, failed: 0 });

  /**
   * Verifica se deve executar pré-carregamento
   */
  const shouldPrefetch = useCallback((): boolean => {
    // Não está logado
    if (!user) return false;
    
    // Já está pré-carregando
    if (isPrefetching.current) return false;
    
    // Conexão não é favorável
    if (!isGoodConnectionForPrefetch(networkInfo)) return false;
    
    // Verifica intervalo mínimo entre prefetches
    const now = Date.now();
    const lastPrefetch = lastPrefetchTime.current || 
      parseInt(localStorage.getItem(LAST_PREFETCH_KEY) || '0', 10);
    
    if (now - lastPrefetch < PREFETCH_CHECK_INTERVAL) return false;
    
    return true;
  }, [user, networkInfo]);

  /**
   * Executa pré-carregamento de imagens em background
   */
  const prefetchInBackground = useCallback(async () => {
    if (!user || isPrefetching.current) return;
    
    isPrefetching.current = true;
    
    try {
      console.log('[WiFiPrefetch] Iniciando pré-carregamento via proxy...');
      
      // Verifica quantas imagens já temos em cache
      const stats = await getImageCacheStats();
      const availableSlots = MAX_CACHE_SIZE - stats.count;
      
      if (availableSlots <= 10) {
        console.log('[WiFiPrefetch] Cache quase cheio, pulando prefetch');
        return;
      }
      
      // Busca imagens que ainda não estão em cache
      // Prioriza: favoritos > assistindo > recentes
      const { data: entries } = await supabase
        .from('anime_entries')
        .select('image_url, is_favorite, status')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(Math.min(BATCH_SIZE * 3, availableSlots));
      
      if (!entries || entries.length === 0) {
        console.log('[WiFiPrefetch] Nenhuma entrada para pré-carregar');
        return;
      }
      
      // Filtra apenas URLs válidas e prioriza favoritos e assistindo
      const prioritizedEntries = [
        ...entries.filter(e => e.is_favorite),
        ...entries.filter(e => e.status === 'watching' && !e.is_favorite),
        ...entries.filter(e => e.status !== 'watching' && !e.is_favorite),
      ];
      
      const imageUrls = prioritizedEntries
        .map(e => e.image_url)
        .filter((url): url is string => !!url)
        .slice(0, BATCH_SIZE);
      
      if (imageUrls.length === 0) {
        console.log('[WiFiPrefetch] Nenhuma imagem para pré-carregar');
        return;
      }
      
      // Pré-carrega usando proxy
      const result = await prefetchImages(imageUrls);
      
      setPrefetchStats(prev => ({
        success: prev.success + result.success,
        failed: prev.failed + result.failed
      }));
      
      // Log de resultado
      if (result.success > 0) {
        console.log(`[WiFiPrefetch] ${result.success} imagens pré-carregadas via proxy`);
      }
      if (result.failed > 0) {
        console.log(`[WiFiPrefetch] ${result.failed} imagens falharam`);
      }
      
      // Atualiza timestamp do último prefetch
      const now = Date.now();
      lastPrefetchTime.current = now;
      localStorage.setItem(LAST_PREFETCH_KEY, now.toString());
      
    } catch (error) {
      console.warn('[WiFiPrefetch] Erro no pré-carregamento:', error);
    } finally {
      isPrefetching.current = false;
    }
  }, [user]);

  /**
   * Efeito que monitora mudanças na conexão
   */
  useEffect(() => {
    // Verifica se deve pré-carregar quando a conexão muda para WiFi
    if (shouldPrefetch()) {
      // Executa após um pequeno delay para garantir estabilidade da conexão
      const timeout = setTimeout(() => {
        prefetchInBackground();
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [networkInfo.type, networkInfo.isOnline, shouldPrefetch, prefetchInBackground]);

  /**
   * Verificação periódica em background
   */
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      if (shouldPrefetch()) {
        prefetchInBackground();
      }
    }, PREFETCH_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [user, shouldPrefetch, prefetchInBackground]);

  return {
    networkInfo,
    isWifi: networkInfo.isWifi,
    isPrefetching: isPrefetching.current,
    prefetchStats,
  };
}
