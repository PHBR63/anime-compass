import { useCallback, useRef, useEffect } from 'react';
import { cacheImage, isImageCached } from '@/lib/imageCache';

// Fila de imagens para prefetch
const prefetchQueue: Set<string> = new Set();

// Flag para indicar se o processamento está ativo
let isProcessing = false;

// Limite de imagens para prefetch simultâneo
const MAX_CONCURRENT_PREFETCH = 2;

// Contadores para limitar prefetch por sessão
let prefetchedThisSession = 0;
const MAX_PREFETCH_PER_SESSION = 100;

/**
 * Processa a fila de prefetch usando requestIdleCallback
 * Isso garante que o prefetch só acontece quando o browser está ocioso
 */
function processQueue(): void {
  if (isProcessing || prefetchQueue.size === 0) return;
  if (prefetchedThisSession >= MAX_PREFETCH_PER_SESSION) return;
  
  isProcessing = true;
  
  const processNext = async (deadline: IdleDeadline) => {
    // Processa enquanto houver tempo disponível
    while (deadline.timeRemaining() > 10 && prefetchQueue.size > 0) {
      // Pega as primeiras URLs da fila
      const batch = Array.from(prefetchQueue).slice(0, MAX_CONCURRENT_PREFETCH);
      
      // Remove da fila antes de processar
      batch.forEach(url => prefetchQueue.delete(url));
      
      // Processa em paralelo
      await Promise.allSettled(
        batch.map(async (url) => {
          try {
            // Verifica se já está em cache antes de baixar
            const cached = await isImageCached(url);
            if (!cached) {
              await cacheImage(url);
              prefetchedThisSession++;
            }
          } catch {
            // Ignora erros silenciosamente
          }
        })
      );
    }
    
    isProcessing = false;
    
    // Continua processando se ainda houver itens na fila
    if (prefetchQueue.size > 0 && prefetchedThisSession < MAX_PREFETCH_PER_SESSION) {
      scheduleProcessing();
    }
  };
  
  // Usa requestIdleCallback se disponível, senão setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(processNext, { timeout: 5000 });
  } else {
    setTimeout(() => {
      processNext({ 
        timeRemaining: () => 50,
        didTimeout: false 
      } as IdleDeadline);
    }, 100);
  }
}

/**
 * Agenda processamento da fila
 */
function scheduleProcessing(): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => processQueue(), { timeout: 5000 });
  } else {
    setTimeout(processQueue, 100);
  }
}

/**
 * Adiciona URL à fila de prefetch
 */
export function queueImagePrefetch(url: string): void {
  if (!url || prefetchedThisSession >= MAX_PREFETCH_PER_SESSION) return;
  if (prefetchQueue.has(url)) return;
  
  prefetchQueue.add(url);
  scheduleProcessing();
}

/**
 * Adiciona múltiplas URLs à fila de prefetch
 */
export function queueImagesPrefetch(urls: string[]): void {
  urls.forEach(url => {
    if (url && !prefetchQueue.has(url)) {
      prefetchQueue.add(url);
    }
  });
  scheduleProcessing();
}

/**
 * Hook para prefetch de imagens próximas do viewport
 * Observa elementos e faz prefetch quando se aproximam da área visível
 */
export function useViewportPrefetch(options?: {
  rootMargin?: string;
  enabled?: boolean;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Set<Element>>(new Set());
  
  const { rootMargin = '200px', enabled = true } = options || {};

  /**
   * Cria observer para detectar elementos próximos do viewport
   */
  useEffect(() => {
    if (!enabled) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLElement;
            const src = img.dataset.prefetchSrc;
            
            if (src) {
              queueImagePrefetch(src);
            }
            
            // Para de observar após prefetch ser agendado
            observerRef.current?.unobserve(entry.target);
            observedElements.current.delete(entry.target);
          }
        });
      },
      {
        rootMargin, // Área extra ao redor do viewport
        threshold: 0,
      }
    );
    
    return () => {
      observerRef.current?.disconnect();
      observedElements.current.clear();
    };
  }, [rootMargin, enabled]);

  /**
   * Registra um elemento para observação
   */
  const observe = useCallback((element: Element | null, src: string) => {
    if (!element || !src || !enabled) return;
    if (observedElements.current.has(element)) return;
    
    // Armazena a URL no elemento para uso no callback
    (element as HTMLElement).dataset.prefetchSrc = src;
    
    observerRef.current?.observe(element);
    observedElements.current.add(element);
  }, [enabled]);

  /**
   * Remove observação de um elemento
   */
  const unobserve = useCallback((element: Element | null) => {
    if (!element) return;
    
    observerRef.current?.unobserve(element);
    observedElements.current.delete(element);
  }, []);

  return { observe, unobserve };
}

/**
 * Hook simplificado para prefetch de uma lista de imagens
 * Faz prefetch inteligente baseado na posição do scroll
 */
export function usePrefetchNearby(
  imageUrls: string[],
  currentIndex: number,
  prefetchAhead: number = 5
) {
  useEffect(() => {
    if (imageUrls.length === 0) return;
    
    // Calcula range de imagens para prefetch
    const startIndex = Math.max(0, currentIndex - 2);
    const endIndex = Math.min(imageUrls.length - 1, currentIndex + prefetchAhead);
    
    // Coleta URLs para prefetch
    const urlsToPrefetch = imageUrls.slice(startIndex, endIndex + 1);
    
    // Usa requestIdleCallback para agendar prefetch
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        queueImagesPrefetch(urlsToPrefetch);
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        queueImagesPrefetch(urlsToPrefetch);
      }, 100);
    }
  }, [imageUrls, currentIndex, prefetchAhead]);
}
