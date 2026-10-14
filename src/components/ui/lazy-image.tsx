import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { cacheImage, getCachedImage } from '@/lib/imageCache';
import { getUsableAnimeImageUrl, isCurrentAnimeImageUrl } from '@/lib/animeImageSources';
import { CATALOG_API_URL } from '@/lib/apiConfig';

/**
 * Componente de skeleton animado para imagens
 * Usa gradiente shimmer com ondas sakura
 */
const ImageSkeleton = React.memo(function ImageSkeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-secondary/30">
      {/* Gradiente base com tons sakura */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-sakura/10 to-secondary/60" />
      
      {/* Shimmer animado */}
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--sakura) / 0.15), hsl(var(--secondary) / 0.3), transparent)',
        }}
      />
      
      {/* Ícone de imagem central sutil */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg 
          className="w-10 h-10 text-muted-foreground/20 animate-pulse"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    </div>
  );
});

/**
 * Indicador de imagem em cache (ícone verde sutil)
 */
const CachedIndicator = React.memo(function CachedIndicator() {
  return (
    <div className="absolute bottom-1 right-1 p-0.5 rounded-full bg-background/60 backdrop-blur-sm">
      <svg 
        className="w-3 h-3 text-green-500" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 13l4 4L19 7" 
        />
      </svg>
    </div>
  );
});

/**
 * Indicador de modo offline
 */
const OfflineIndicator = React.memo(function OfflineIndicator() {
  return (
    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/80 text-white backdrop-blur-sm">
      Offline
    </div>
  );
});

/** Gerencia a capa com recuperação local → original → placeholder e limpeza do cache temporário. */
function useAnimeImageLoading(src: string, localSrc: string | undefined, fallback: string, enableCache: boolean, isInView: boolean) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>();
  const [isCached, setIsCached] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isLocalImage, setIsLocalImage] = useState(false);
  const sources = useRef<string[]>([]);
  const sourceIndex = useRef(0);
  const generation = useRef(0);
  const effectiveSrc = getUsableAnimeImageUrl(localSrc) || getUsableAnimeImageUrl(src) || fallback;

  useEffect(() => {
    if (!isInView) return;
    const currentGeneration = ++generation.current;
    let cancelled = false;
    let objectUrl: string | undefined;
    const controller = new AbortController();
    setIsLoaded(false);
    setIsCached(false);
    setIsFromCache(false);
    setIsLocalImage(false);
    setImageSrc(undefined);
    sources.current = [];
    sourceIndex.current = 0;

    /** Recupera a URL original quando uma entrada salva ainda contém uma capa de ambiente antigo. */
    async function carregarCapa() {
      const local = localSrc && isCurrentAnimeImageUrl(localSrc) ? localSrc : undefined;
      let original = getUsableAnimeImageUrl(src);
      if (!original) {
        const malId = src.match(/\/anime-images\/(\d+)\.[^/]+$/)?.[1];
        if (malId) {
          try {
            const response = await fetch(`${CATALOG_API_URL}?mal_id=${malId}`, { signal: controller.signal });
            if (response.ok) {
              const result = await response.json();
              original = getUsableAnimeImageUrl(result.data?.image_url);
            }
          } catch {
            // A indisponibilidade do catálogo não impede a exibição do placeholder.
          }
        }
      }
      const candidates = [...new Set([local, original, fallback].filter((url): url is string => Boolean(url)))];
      if (cancelled) return;
      if (enableCache && candidates[0] !== fallback) {
        try {
          const cached = await getCachedImage(candidates[0]);
          if (cached && cached.ok) {
            const blob = await cached.blob();
            if (cancelled) return;
            objectUrl = URL.createObjectURL(blob);
            candidates.unshift(objectUrl);
          }
        } catch {
          // Falhas no cache não interrompem o carregamento da imagem original.
        }
      }
      if (cancelled) return;
      sources.current = candidates;
      setImageSrc(candidates[0]);
      setIsFromCache(Boolean(objectUrl));
      setIsCached(Boolean(objectUrl));
      setIsLocalImage(Boolean(local && candidates[0] === local));
    }
    void carregarCapa();
    return () => {
      cancelled = true;
      controller.abort();
      if (generation.current === currentGeneration) generation.current++;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, localSrc, fallback, enableCache, isInView]);

  /** Revela a capa e salva somente imagens válidas, sem guardar o placeholder. */
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    if (enableCache && imageSrc && imageSrc !== fallback && !isFromCache && !isLocalImage) {
      const currentGeneration = generation.current;
      void cacheImage(imageSrc).then(cached => {
        if (generation.current === currentGeneration && cached) setIsCached(true);
      }).catch(() => { /* O cache é opcional e não interfere na capa exibida. */ });
    }
  }, [enableCache, imageSrc, fallback, isFromCache, isLocalImage]);

  /** Tenta a próxima origem antes de recorrer ao placeholder, sem ciclos de erro. */
  const handleError = useCallback(() => {
    const next = sources.current[++sourceIndex.current];
    setIsFromCache(false);
    setIsCached(false);
    setIsLocalImage(Boolean(next && isCurrentAnimeImageUrl(next)));
    if (next) {
      setIsLoaded(false);
      setImageSrc(next);
    } else {
      setIsLoaded(true);
    }
  }, []);

  return { isLoaded, imageSrc, isCached, isFromCache, isLocalImage, effectiveSrc, handleLoad, handleError };
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  localSrc?: string; // URL local do CDN (prioridade)
  alt: string;
  fallback?: string;
  className?: string;
  containerClassName?: string;
  showSkeleton?: boolean;
  enableCache?: boolean;
  showCacheIndicator?: boolean;
}

/**
 * Componente de imagem com lazy loading usando Intersection Observer
 * Carrega imagens apenas quando entram no viewport
 * Suporta cache local para uso offline com fallback chain
 */
export const LazyImage = React.memo(function LazyImage({
  src,
  localSrc,
  alt,
  fallback = '/placeholder.svg',
  className,
  containerClassName,
  showSkeleton = true,
  enableCache = true,
  showCacheIndicator = false,
  ...props
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { isLoaded, imageSrc, isCached, isFromCache, isLocalImage, effectiveSrc, handleLoad, handleError } =
    useAnimeImageLoading(src, localSrc, fallback, enableCache, isInView);

  // Intersection Observer para detectar quando imagem entra no viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Pré-carrega 200px antes de entrar no viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return () => {
      if (isFromCache && imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [isInView, effectiveSrc, localSrc, enableCache]);

  // Handler para quando imagem carrega - adiciona ao cache em background
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    
    // Adiciona ao cache em background se habilitado e não veio do cache/local
    if (enableCache && effectiveSrc && !isFromCache && !isLocalImage) {
      cacheImage(effectiveSrc)
        .then((cached) => {
          if (cached) setIsCached(true);
        })
        .catch(() => {
          // Silencia erros de cache - não afeta UX
        });
    }
  }, [enableCache, effectiveSrc, isFromCache, isLocalImage]);

  // Handler para erro de carregamento
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
    setImageSrc(fallback);
  }, [fallback]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', containerClassName)}>
      {/* Skeleton animado de loading */}
      {showSkeleton && !isLoaded && <ImageSkeleton />}

      {/* Imagem real - só renderiza src quando está no viewport */}
      <img
        ref={imgRef}
        src={imageSrc}
        data-src={effectiveSrc}
        data-local={isLocalImage ? 'true' : undefined}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        {...props}
      />
      
      {/* Indicador de modo offline (se veio do cache) */}
      {isFromCache && isLoaded && !navigator.onLine && <OfflineIndicator />}
      
      {/* Indicador de cache (opcional) */}
      {showCacheIndicator && isCached && isLoaded && !isFromCache && <CachedIndicator />}
    </div>
  );
});

/**
 * Componente otimizado para imagens de anime cards
 * Inclui aspect ratio, efeitos de hover e cache local com fallback chain
 */
export const AnimeCardImage = React.memo(function AnimeCardImage({
  src,
  localSrc,
  alt,
  className,
  showHoverEffect = true,
  enableCache = true,
}: {
  src: string;
  localSrc?: string; // URL local do CDN (prioridade)
  alt: string;
  className?: string;
  showHoverEffect?: boolean;
  enableCache?: boolean;
}) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoaded, imageSrc, isCached, isFromCache, isLocalImage, effectiveSrc, handleLoad, handleError } =
    useAnimeImageLoading(src, localSrc, '/placeholder.svg', enableCache, isInView);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '150px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return () => {
      if (isFromCache && imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [isInView, effectiveSrc, localSrc, enableCache]);

  // Handler de load com cache
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    
    // Adiciona ao cache em background se não veio do cache/local
    if (enableCache && effectiveSrc && !isFromCache && !isLocalImage) {
      cacheImage(effectiveSrc)
        .then((cached) => {
          if (cached) setIsCached(true);
        })
        .catch(() => {
          // Silencia erros de cache - não afeta UX
        });
    }
  }, [enableCache, effectiveSrc, isFromCache, isLocalImage]);

  // Handler de erro
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
    setImageSrc('/placeholder.svg');
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Skeleton animado com shimmer */}
      {!isLoaded && <ImageSkeleton />}

      {/* Imagem */}
      {isInView && imageSrc && (
        <img
          src={imageSrc}
          data-local={isLocalImage ? 'true' : undefined}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            showHoverEffect && 'group-hover:scale-110',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}
      
      {/* Indicador de modo offline (se veio do cache) */}
      {isFromCache && isLoaded && !navigator.onLine && <OfflineIndicator />}
    </div>
  );
});
