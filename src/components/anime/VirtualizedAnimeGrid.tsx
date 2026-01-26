import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CatalogAnimeCard } from './CatalogAnimeCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogAnime } from '@/types/catalog';

interface VirtualizedAnimeGridProps {
  /** Lista de animes para exibir */
  animes: CatalogAnime[];
  /** Se true, mostra o ranking (posição) em cada card */
  showRanking?: boolean;
  /** Número de colunas por breakpoint - calculado automaticamente */
  className?: string;
  /** Altura estimada de cada row (incluindo gap) */
  estimatedRowHeight?: number;
  /** Callback quando o usuário rola até o final */
  onEndReached?: () => void;
  /** Se está carregando mais itens */
  isLoadingMore?: boolean;
}

/**
 * Grid virtualizado para exibir centenas de cards de anime com performance
 * Usa @tanstack/react-virtual para renderizar apenas itens visíveis
 */
export function VirtualizedAnimeGrid({
  animes,
  showRanking = false,
  className = '',
  estimatedRowHeight = 280,
  onEndReached,
  isLoadingMore = false,
}: VirtualizedAnimeGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Calcula número de colunas baseado na largura do container
  const getColumnCount = useCallback(() => {
    if (!parentRef.current) return 6;
    const width = parentRef.current.offsetWidth;
    if (width < 640) return 2; // sm
    if (width < 768) return 3; // md
    if (width < 1024) return 4; // lg
    return 6; // xl+
  }, []);

  const [columnCount, setColumnCount] = React.useState(6);

  // Atualiza colunas quando o container redimensiona
  React.useEffect(() => {
    const updateColumns = () => setColumnCount(getColumnCount());
    updateColumns();

    const resizeObserver = new ResizeObserver(updateColumns);
    if (parentRef.current) {
      resizeObserver.observe(parentRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [getColumnCount]);

  // Calcula número de rows
  const rowCount = Math.ceil(animes.length / columnCount);

  // Configura o virtualizador
  const rowVirtualizer = useVirtualizer({
    count: rowCount + (isLoadingMore ? 1 : 0), // +1 row para loading
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 2, // Renderiza 2 rows extras para scroll suave
  });

  // Detecta quando chega ao final
  React.useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    
    if (!lastItem) return;

    if (lastItem.index >= rowCount - 1 && onEndReached && !isLoadingMore) {
      onEndReached();
    }
  }, [rowVirtualizer.getVirtualItems(), rowCount, onEndReached, isLoadingMore]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ 
        height: '100%',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const isLoaderRow = virtualRow.index >= rowCount;
          
          if (isLoaderRow) {
            return (
              <div
                key="loader"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              >
                {Array.from({ length: columnCount }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[3/4] rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            );
          }

          // Calcula os animes desta row
          const startIndex = virtualRow.index * columnCount;
          const rowAnimes = animes.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
            >
              {rowAnimes.map((anime, colIndex) => (
                <CatalogAnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  rank={showRanking ? startIndex + colIndex + 1 : undefined}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Versão simplificada sem virtualização para listas pequenas
 * Usa renderização normal quando há menos de 50 itens
 */
export function SimpleAnimeGrid({
  animes,
  showRanking = false,
}: {
  animes: CatalogAnime[];
  showRanking?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {animes.map((anime, index) => (
        <CatalogAnimeCard
          key={anime.mal_id}
          anime={anime}
          rank={showRanking ? index + 1 : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Componente adaptativo que escolhe entre virtualizado e simples
 * baseado na quantidade de itens
 */
export function AdaptiveAnimeGrid({
  animes,
  showRanking = false,
  onEndReached,
  isLoadingMore = false,
  virtualizationThreshold = 50,
}: VirtualizedAnimeGridProps & {
  virtualizationThreshold?: number;
}) {
  // Usa grid simples para poucos itens (melhor para animações)
  if (animes.length < virtualizationThreshold) {
    return (
      <>
        <SimpleAnimeGrid animes={animes} showRanking={showRanking} />
        {isLoadingMore && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[3/4] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // Usa grid virtualizado para muitos itens
  return (
    <VirtualizedAnimeGrid
      animes={animes}
      showRanking={showRanking}
      onEndReached={onEndReached}
      isLoadingMore={isLoadingMore}
      className="min-h-[600px]"
    />
  );
}
