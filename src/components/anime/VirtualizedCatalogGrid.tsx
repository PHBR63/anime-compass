import React, { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CatalogAnimeCard } from './CatalogAnimeCard';
import { cn } from '@/lib/utils';
import type { CatalogAnime } from '@/types/catalog';

interface VirtualizedCatalogGridProps {
  animes: CatalogAnime[];
  className?: string;
}

/**
 * Grid virtualizado de animes do catálogo para melhor performance
 * Usado na página Discover para renderizar milhares de animes eficientemente
 * Usa @tanstack/react-virtual para virtualização eficiente
 */
export function VirtualizedCatalogGrid({
  animes,
  className,
}: VirtualizedCatalogGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calcula número de colunas baseado na largura do container
  const getColumnCount = useCallback(() => {
    if (typeof window === 'undefined') return 6;
    const width = parentRef.current?.offsetWidth || window.innerWidth;
    
    // Breakpoints: grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6
    if (width < 640) return 2;  // mobile
    if (width < 768) return 3;  // sm
    if (width < 1024) return 4; // md
    return 6; // lg+
  }, []);

  // Estado derivado: número de colunas
  const columnCount = useMemo(() => getColumnCount(), [getColumnCount]);

  // Agrupa animes em linhas
  const rows = useMemo(() => {
    const result: CatalogAnime[][] = [];
    for (let i = 0; i < animes.length; i += columnCount) {
      result.push(animes.slice(i, i + columnCount));
    }
    return result;
  }, [animes, columnCount]);

  // Altura estimada de cada linha (card aspect-ratio 3/4 + texto + gap)
  const estimateRowHeight = useCallback(() => {
    if (typeof window === 'undefined') return 280;
    const width = parentRef.current?.offsetWidth || window.innerWidth;
    const cardWidth = (width - (columnCount - 1) * 16) / columnCount; // 16px = gap-4
    const cardHeight = cardWidth * (4 / 3); // aspect ratio 3/4
    return cardHeight + 60 + 16; // + espaço para título/rating + gap
  }, [columnCount]);

  // Virtualizador para linhas
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateRowHeight,
    overscan: 3, // Renderiza 3 linhas extras para scroll suave
  });

  if (animes.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={cn("h-[calc(100vh-400px)] min-h-[500px] overflow-auto", className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {row.map((anime) => (
                  <CatalogAnimeCard key={anime.mal_id} anime={anime} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
