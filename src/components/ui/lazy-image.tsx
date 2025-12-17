import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  containerClassName?: string;
  showSkeleton?: boolean;
}

/**
 * Componente de imagem com lazy loading usando Intersection Observer
 * Carrega imagens apenas quando entram no viewport
 */
export const LazyImage = React.memo(function LazyImage({
  src,
  alt,
  fallback = '/placeholder.svg',
  className,
  containerClassName,
  showSkeleton = true,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
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

  // Handler para quando imagem carrega
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Handler para erro de carregamento
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', containerClassName)}>
      {/* Skeleton de loading */}
      {showSkeleton && !isLoaded && (
        <div className="absolute inset-0 bg-secondary/50 animate-pulse" />
      )}

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
    </div>
  );
});

/**
 * Componente otimizado para imagens de anime cards
 * Inclui aspect ratio e efeitos de hover
 */
export const AnimeCardImage = React.memo(function AnimeCardImage({
  src,
  alt,
  className,
  showHoverEffect = true,
}: {
  src: string;
  alt: string;
  className?: string;
  showHoverEffect?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
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

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 to-secondary/30 animate-pulse" />
      )}

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
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
});
