import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { cacheImage, isImageCached } from '@/lib/imageCache';

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
 * Indicador de imagem em cache (ícone sutil)
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

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
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
 * Suporta cache local para uso offline
 */
export const LazyImage = React.memo(function LazyImage({
  src,
  alt,
  fallback = '/placeholder.svg',
  className,
  containerClassName,
  showSkeleton = true,
  enableCache = true,
  showCacheIndicator = false,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        rootMargin: '100px', // Carrega 100px antes de entrar no viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Verifica se imagem está em cache quando entra no viewport
  useEffect(() => {
    if (isInView && enableCache && src) {
      isImageCached(src).then(setIsCached);
    }
  }, [isInView, enableCache, src]);

  // Handler para quando imagem carrega - adiciona ao cache
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    
    // Adiciona ao cache em background se habilitado
    if (enableCache && src && !isCached) {
      cacheImage(src).then((cached) => {
        if (cached) setIsCached(true);
      });
    }
  }, [enableCache, src, isCached]);

  // Handler para erro de carregamento
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', containerClassName)}>
      {/* Skeleton animado de loading */}
      {showSkeleton && !isLoaded && <ImageSkeleton />}

      {/* Imagem real - só renderiza src quando está no viewport */}
      <img
        ref={imgRef}
        src={isInView ? (hasError ? fallback : src) : undefined}
        data-src={src}
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
      
      {/* Indicador de cache (opcional) */}
      {showCacheIndicator && isCached && isLoaded && <CachedIndicator />}
    </div>
  );
});

/**
 * Componente otimizado para imagens de anime cards
 * Inclui aspect ratio, efeitos de hover e cache local
 */
export const AnimeCardImage = React.memo(function AnimeCardImage({
  src,
  alt,
  className,
  showHoverEffect = true,
  enableCache = true,
}: {
  src: string;
  alt: string;
  className?: string;
  showHoverEffect?: boolean;
  enableCache?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Verifica cache quando entra no viewport
  useEffect(() => {
    if (isInView && enableCache && src) {
      isImageCached(src).then(setIsCached);
    }
  }, [isInView, enableCache, src]);

  // Handler de load com cache
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    
    // Adiciona ao cache em background
    if (enableCache && src && !isCached) {
      cacheImage(src).then((cached) => {
        if (cached) setIsCached(true);
      });
    }
  }, [enableCache, src, isCached]);

  // Handler de erro
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Skeleton animado com shimmer */}
      {!isLoaded && <ImageSkeleton />}

      {/* Imagem */}
      {isInView && (
        <img
          src={hasError ? '/placeholder.svg' : src}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-all duration-500',
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
    </div>
  );
});
