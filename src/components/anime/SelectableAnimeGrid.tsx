import React, { useCallback } from 'react';
import { SelectableAnimeCard } from './SelectableAnimeCard';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];

interface SelectableAnimeGridProps {
  entries: AnimeEntry[];
  isSelectionMode: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

/**
 * Grid de animes com suporte a seleção múltipla para edição em massa
 * Otimizado com useCallback para evitar re-renders desnecessários
 */
export function SelectableAnimeGrid({
  entries,
  isSelectionMode,
  selectedIds,
  onSelectionChange,
}: SelectableAnimeGridProps) {
  // Handler memoizado para alternar seleção de um item
  const handleToggleSelect = useCallback((id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    );
  }, [selectedIds, onSelectionChange]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {entries.map((entry) => (
        <SelectableAnimeCard
          key={entry.id}
          entry={entry}
          isSelectionMode={isSelectionMode}
          isSelected={selectedIds.includes(entry.id)}
          onSelectToggle={handleToggleSelect}
        />
      ))}
    </div>
  );
}
