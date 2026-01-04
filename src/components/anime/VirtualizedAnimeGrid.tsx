import React, { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SelectableAnimeCard } from './SelectableAnimeCard';
import { AnimeCard } from './AnimeCard';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];

interface VirtualizedAnimeGridProps {
  entries: AnimeEntry[];
  isSelectionMode?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
}

/**
 * Grid virtualizado de animes para melhor performance com listas grandes
 * Renderiza apenas os itens visíveis + buffer para scroll suave
 * Usa @tanstack/react-virtual para virtualização eficiente
 */
export function VirtualizedAnimeGrid({
  entries,
  isSelectionMode = false,
  selectedIds = [],
  onSelectionChange,
  className,
}: VirtualizedAnimeGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calcula número de colunas baseado na largura do container
  const getColumnCount = useCallback(() => {
    if (typeof window === 'undefined') return 5;
    const width = parentRef.current?.offsetWidth || window.innerWidth;
    
    // Breakpoints: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
    if (width < 640) return 2;  // mobile
    if (width < 1024) return 3; // sm
    if (width < 1280) return 4; // lg
    return 5; // xl
  }, []);

  // Estado derivado: número de colunas
  const columnCount = useMemo(() => getColumnCount(), [getColumnCount]);

  // Agrupa entries em linhas
  const rows = useMemo(() => {
    const result: AnimeEntry[][] = [];
    for (let i = 0; i < entries.length; i += columnCount) {
      result.push(entries.slice(i, i + columnCount));
    }
    return result;
  }, [entries, columnCount]);

  // Altura estimada de cada linha (card aspect-ratio 3/4 + gap)
  const estimateRowHeight = useCallback(() => {
    if (typeof window === 'undefined') return 320;
    const width = parentRef.current?.offsetWidth || window.innerWidth;
    const cardWidth = (width - (columnCount - 1) * 16) / columnCount; // 16px = gap-4
    const cardHeight = cardWidth * (4 / 3); // aspect ratio 3/4
    return cardHeight + 16; // + gap
  }, [columnCount]);

  // Virtualizador para linhas
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateRowHeight,
    overscan: 3, // Renderiza 3 linhas extras para scroll suave
  });

  // Handler para alternar seleção
  const handleToggleSelect = useCallback((id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    );
  }, [selectedIds, onSelectionChange]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={cn("min-h-[400px] max-h-[calc(100vh-300px)] overflow-auto bg-transparent", className)}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 h-full">
                {row.map((entry) => (
                  isSelectionMode ? (
                    <SelectableAnimeCard
                      key={entry.id}
                      entry={entry}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.includes(entry.id)}
                      onSelectToggle={handleToggleSelect}
                    />
                  ) : (
                    <AnimeCard key={entry.id} entry={entry} />
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
