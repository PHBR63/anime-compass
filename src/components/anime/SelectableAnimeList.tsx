import { SelectableAnimeListItem } from './SelectableAnimeListItem';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];

interface SelectableAnimeListProps {
  entries: AnimeEntry[];
  isSelectionMode: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

/**
 * Lista de animes com suporte a seleção múltipla para edição em massa
 */
export function SelectableAnimeList({
  entries,
  isSelectionMode,
  selectedIds,
  onSelectionChange,
}: SelectableAnimeListProps) {
  // Handler para alternar seleção de um item
  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <SelectableAnimeListItem
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
