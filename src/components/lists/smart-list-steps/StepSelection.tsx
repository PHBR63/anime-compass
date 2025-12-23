import { useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FranchiseListView } from '../FranchiseGroupView';
import { FranchiseSearch } from '../FranchiseSearch';
import { MissingAnimeSuggestion } from '../MissingAnimeSuggestion';
import { cn } from '@/lib/utils';
import type { AnimeEntry, FranchiseGroup } from '@/lib/franchiseDetector';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

// Labels para os status
const statusLabels: Record<AnimeStatus, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Dropado',
  not_started: 'Planejado',
};

interface StepSelectionProps {
  viewMode: 'individual' | 'franchise';
  filteredEntries: AnimeEntry[];
  franchiseGroups: FranchiseGroup[];
  selectedIds: Set<string>;
  selectedEntries: AnimeEntry[];
  onToggleEntry: (id: string) => void;
  onToggleFranchise: (entries: AnimeEntry[]) => void;
  onSelectAllFiltered: (entries: AnimeEntry[]) => void;
  onClearSelection: () => void;
  hasActiveFilters: boolean;
}

/**
 * Etapa 3: Seleção de animes
 * Lista com checkboxes para seleção individual ou por franquia
 */
export function StepSelection({
  viewMode,
  filteredEntries,
  franchiseGroups,
  selectedIds,
  selectedEntries,
  onToggleEntry,
  onToggleFranchise,
  onSelectAllFiltered,
  onClearSelection,
  hasActiveFilters,
}: StepSelectionProps) {
  // Handler para selecionar todos
  const handleSelectAll = useCallback(() => {
    if (viewMode === 'franchise') {
      const allEntries = franchiseGroups.flatMap(g => g.entries);
      onSelectAllFiltered(allEntries);
    } else {
      onSelectAllFiltered(filteredEntries);
    }
  }, [viewMode, franchiseGroups, filteredEntries, onSelectAllFiltered]);

  const totalAvailable = viewMode === 'franchise' 
    ? franchiseGroups.flatMap(g => g.entries).length 
    : filteredEntries.length;

  const allSelected = selectedIds.size === totalAvailable && totalAvailable > 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Header com contador e ações */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {viewMode === 'franchise' ? (
              <>{franchiseGroups.length} franquias</>
            ) : (
              <>{filteredEntries.length} animes</>
            )}
          </Label>
          <Badge variant="secondary" className="text-xs">
            {selectedIds.size > 0 ? `${selectedEntries.length} selecionados` : 'Todos incluídos'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleSelectAll}
          >
            <Check className="h-3.5 w-3.5" />
            {allSelected ? 'Todos selecionados' : 'Selecionar todos'}
          </Button>
          
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground"
              onClick={onClearSelection}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo baseado no modo */}
      {viewMode === 'individual' ? (
        /* Lista Individual */
        filteredEntries.length > 0 ? (
        <ScrollArea className="h-[250px] sm:h-[280px] rounded-lg border bg-secondary/10">
            <div className="p-2 space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredEntries.map((entry, index) => (
                  <motion.div 
                    key={entry.id} 
                    className={cn(
                      "flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer",
                      (selectedIds.size === 0 || selectedIds.has(entry.id)) && "bg-primary/5"
                    )}
                    onClick={() => onToggleEntry(entry.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.01, 0.3) }}
                    layout
                  >
                    <Checkbox
                      checked={selectedIds.size === 0 || selectedIds.has(entry.id)}
                      onCheckedChange={() => onToggleEntry(entry.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                    <img 
                      src={entry.image_url || '/placeholder.svg'} 
                      alt={entry.title}
                      className="w-8 h-10 rounded object-cover flex-shrink-0"
                    />
                    <span className="truncate flex-1 text-sm">{entry.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.rating && (
                        <span className="text-xs text-yellow-500 font-medium">★{entry.rating}</span>
                      )}
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {statusLabels[entry.status as AnimeStatus]}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[250px] sm:h-[280px] rounded-lg border bg-secondary/10 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? 'Nenhum anime encontrado' : 'Selecione filtros para ver animes'}
            </p>
          </div>
        )
      ) : (
        /* Lista por Franquia */
        <div className="space-y-3">
          {/* Busca de franquias */}
          <FranchiseSearch
            franchiseGroups={franchiseGroups}
            selectedIds={selectedIds}
            onToggleEntry={onToggleEntry}
            onToggleFranchise={onToggleFranchise}
            onSelectAllFiltered={onSelectAllFiltered}
            placeholder="Buscar franquia..."
          />

          {franchiseGroups.length > 0 ? (
            <ScrollArea className="h-[200px] sm:h-[230px] rounded-lg border bg-secondary/10 p-2">
              <FranchiseListView
                groups={franchiseGroups}
                selectedIds={selectedIds}
                onToggleEntry={onToggleEntry}
                onToggleFranchise={onToggleFranchise}
                maxVisible={20}
              />
            </ScrollArea>
          ) : (
            <div className="h-[200px] sm:h-[230px] rounded-lg border bg-secondary/10 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? 'Nenhuma franquia encontrada' : 'Selecione filtros para ver franquias'}
              </p>
            </div>
          )}

          {/* Sugestão de animes faltando */}
          {selectedIds.size > 0 && franchiseGroups.length > 0 && (
            <MissingAnimeSuggestion
              franchiseGroups={franchiseGroups}
              selectedIds={selectedIds}
            />
          )}
        </div>
      )}
    </div>
  );
}
