import { useState, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { FranchiseGroup, AnimeEntry } from '@/lib/franchiseDetector';

interface FranchiseSearchProps {
  /** Grupos de franquias disponíveis */
  franchiseGroups: FranchiseGroup[];
  /** IDs selecionados atualmente */
  selectedIds: Set<string>;
  /** Callback para toggle de entrada individual */
  onToggleEntry: (entryId: string) => void;
  /** Callback para toggle de franquia inteira */
  onToggleFranchise: (entries: AnimeEntry[]) => void;
  /** Callback para selecionar todas as franquias filtradas */
  onSelectAllFiltered?: (entries: AnimeEntry[]) => void;
  /** Placeholder do campo de busca */
  placeholder?: string;
}

/**
 * Componente de busca de franquias com autocomplete
 * Permite filtrar e selecionar franquias rapidamente
 */
export function FranchiseSearch({
  franchiseGroups,
  selectedIds,
  onToggleEntry,
  onToggleFranchise,
  onSelectAllFiltered,
  placeholder = "Buscar franquia...",
}: FranchiseSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filtra franquias baseado na busca
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return franchiseGroups;
    
    const query = searchQuery.toLowerCase().trim();
    return franchiseGroups.filter(group => 
      group.baseName.toLowerCase().includes(query) ||
      group.entries.some(entry => entry.title.toLowerCase().includes(query))
    );
  }, [franchiseGroups, searchQuery]);

  // Sugestões de autocomplete (top 5)
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    return filteredGroups.slice(0, 5);
  }, [filteredGroups, searchQuery]);

  // Total de entradas das franquias filtradas
  const totalFilteredEntries = useMemo(() => {
    return filteredGroups.flatMap(g => g.entries);
  }, [filteredGroups]);

  // Verifica se todas as filtradas estão selecionadas
  const allFilteredSelected = useMemo(() => {
    if (totalFilteredEntries.length === 0) return false;
    return totalFilteredEntries.every(e => selectedIds.has(e.id));
  }, [totalFilteredEntries, selectedIds]);

  // Handler para selecionar franquia da sugestão
  const handleSelectSuggestion = useCallback((group: FranchiseGroup) => {
    onToggleFranchise(group.entries);
    setSearchQuery('');
    setShowSuggestions(false);
  }, [onToggleFranchise]);

  // Handler para selecionar todas as filtradas
  const handleSelectAll = useCallback(() => {
    if (onSelectAllFiltered) {
      onSelectAllFiltered(totalFilteredEntries);
    }
  }, [onSelectAllFiltered, totalFilteredEntries]);

  // Limpar busca
  const handleClear = useCallback(() => {
    setSearchQuery('');
    setShowSuggestions(false);
  }, []);

  // Verifica se a franquia está totalmente selecionada
  const isFranchiseSelected = useCallback((group: FranchiseGroup) => {
    return group.entries.every(e => selectedIds.has(e.id));
  }, [selectedIds]);

  // Conta quantos da franquia estão selecionados
  const getSelectedCount = useCallback((group: FranchiseGroup) => {
    return group.entries.filter(e => selectedIds.has(e.id)).length;
  }, [selectedIds]);

  return (
    <div className="space-y-3">
      {/* Campo de busca */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(e.target.value.length >= 2);
            }}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            placeholder={placeholder}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Dropdown de sugestões */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg">
            <ScrollArea className="max-h-48">
              {suggestions.map((group) => (
                <button
                  key={group.baseName}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary/50 transition-colors",
                    isFranchiseSelected(group) && "bg-primary/10"
                  )}
                  onClick={() => handleSelectSuggestion(group)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Checkbox 
                      checked={isFranchiseSelected(group)} 
                      className="pointer-events-none"
                    />
                    <span className="truncate font-medium">{group.baseName}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {group.totalEntries} {group.totalEntries === 1 ? 'anime' : 'animes'}
                    </Badge>
                    {group.averageRating && (
                      <Badge variant="outline" className="text-xs">
                        ★ {group.averageRating}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </ScrollArea>
            
            {filteredGroups.length > 5 && (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                +{filteredGroups.length - 5} mais resultados
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contador e ações rápidas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {searchQuery ? (
              <>
                {filteredGroups.length} de {franchiseGroups.length} franquias
              </>
            ) : (
              <>{franchiseGroups.length} franquias</>
            )}
          </span>
          {searchQuery && onSelectAllFiltered && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleSelectAll}
            >
              {allFilteredSelected ? 'Desmarcar' : 'Selecionar'} todas
            </Button>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Ocultar lista
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Ver todas
            </>
          )}
        </Button>
      </div>

      {/* Lista expandida de franquias */}
      {isExpanded && (
        <ScrollArea className="h-48 rounded-md border bg-secondary/20">
          <div className="p-2 space-y-1">
            {(searchQuery ? filteredGroups : franchiseGroups).map((group) => {
              const isSelected = isFranchiseSelected(group);
              const selectedCount = getSelectedCount(group);
              const isPartiallySelected = selectedCount > 0 && selectedCount < group.totalEntries;
              
              return (
                <button
                  key={group.baseName}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-secondary/50 transition-colors",
                    isSelected && "bg-primary/10"
                  )}
                  onClick={() => onToggleFranchise(group.entries)}
                >
                  <Checkbox 
                    checked={isSelected}
                    className={cn(
                      "pointer-events-none",
                      isPartiallySelected && "data-[state=unchecked]:bg-primary/30"
                    )}
                  />
                  <span className="truncate flex-1 text-left">{group.baseName}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isPartiallySelected && (
                      <span className="text-[10px] text-muted-foreground">
                        {selectedCount}/{group.totalEntries}
                      </span>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {group.totalEntries}
                    </Badge>
                    {group.averageRating && (
                      <span className="text-[10px] text-yellow-500">
                        ★ {group.averageRating}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
