import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimeListItem } from './AnimeListItem';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];

interface VirtualizedAnimeListProps {
  entries: AnimeEntry[];
  className?: string;
}

/**
 * Lista virtualizada de animes para melhor performance com listas grandes
 * Renderiza apenas os itens visíveis + buffer para scroll suave
 * Usa @tanstack/react-virtual para virtualização eficiente
 */
export function VirtualizedAnimeList({
  entries,
  className,
}: VirtualizedAnimeListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Altura estimada de cada item da lista (h-28 = 112px + gap 12px)
  const estimateRowHeight = useCallback(() => 124, []);

  // Virtualizador para itens da lista
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateRowHeight,
    overscan: 5, // Renderiza 5 itens extras para scroll suave
  });

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={cn("h-[calc(100vh-300px)] overflow-auto", className)}
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
          const entry = entries[virtualRow.index];
          
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
                paddingBottom: '12px', // gap space-y-3
              }}
            >
              <AnimeListItem entry={entry} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
