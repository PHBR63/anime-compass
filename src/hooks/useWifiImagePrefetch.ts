import { useEffect, useRef, useCallback } from 'react';
import { useNetworkType, isGoodConnectionForPrefetch } from './useNetworkType';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { prefetchImages, getImageCacheStats } from '@/lib/imageCache';

// Intervalo entre verificações de pré-carregamento (5 minutos)
const PREFETCH_CHECK_INTERVAL = 5 * 60 * 1000;

// Máximo de imagens para pré-carregar por lote
const BATCH_SIZE = 20;

// Key para armazenar timestamp do último prefetch
const LAST_PREFETCH_KEY = 'anicheck-last-wifi-prefetch';

/**
 * Hook que monitora a conexão e pré-carrega imagens automaticamente em WiFi
 * Executa em background sem bloquear a interface
 */
export function useWifiImagePrefetch() {
  const networkInfo = useNetworkType();
  const { user } = useAuth();
  const isPrefetching = useRef(false);
  const lastPrefetchTime = useRef<number>(0);

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
      console.log('[WiFiPrefetch] Iniciando pré-carregamento em WiFi...');
      
      // Verifica quantas imagens já temos em cache
      const stats = await getImageCacheStats();
      const availableSlots = 500 - stats.count;
      
      if (availableSlots <= 10) {
        console.log('[WiFiPrefetch] Cache quase cheio, pulando prefetch');
        return;
      }
      
      // Busca imagens que ainda não estão em cache
      const { data: entries } = await supabase
        .from('anime_entries')
        .select('image_url')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(Math.min(BATCH_SIZE * 3, availableSlots)); // Busca mais para ter margem
      
      if (!entries || entries.length === 0) {
        console.log('[WiFiPrefetch] Nenhuma entrada para pré-carregar');
        return;
      }
      
      // Filtra apenas URLs válidas
      const imageUrls = entries
        .map(e => e.image_url)
        .filter((url): url is string => !!url);
      
      if (imageUrls.length === 0) {
        console.log('[WiFiPrefetch] Nenhuma imagem para pré-carregar');
        return;
      }
      
      // Pré-carrega em lotes menores para não sobrecarregar
      const urlsToFetch = imageUrls.slice(0, BATCH_SIZE);
      const result = await prefetchImages(urlsToFetch);
      
      // Log menos verboso - apenas sucessos
      if (result.success > 0) {
        console.log(`[WiFiPrefetch] ${result.success} imagens pré-carregadas`);
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
      }, 2000);
      
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
  };
}
