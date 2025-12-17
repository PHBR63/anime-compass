import { useState } from 'react';
import { ChevronDown, ChevronRight, Film, Tv, Star, PlayCircle, Check, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { FranchiseGroup, AnimeEntry } from '@/lib/franchiseDetector';

interface FranchiseGroupViewProps {
  group: FranchiseGroup;
  selectedIds: Set<string>;
  onToggleEntry: (entryId: string) => void;
  onToggleFranchise: (entries: AnimeEntry[]) => void;
}

/**
 * Componente para exibir um grupo de franquia com seus animes
 */
export function FranchiseGroupView({ 
  group, 
  selectedIds, 
  onToggleEntry,
  onToggleFranchise 
}: FranchiseGroupViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calcular quantos estão selecionados
  const selectedCount = group.entries.filter(e => selectedIds.has(e.id)).length;
  const allSelected = selectedCount === group.totalEntries;
  const someSelected = selectedCount > 0 && !allSelected;
  
  // Calcular progresso da franquia
  const progressPercent = (group.completedCount / group.totalEntries) * 100;
  
  // Ícone de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'watching':
        return <PlayCircle className="h-3 w-3 text-primary" />;
      case 'paused':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-secondary/20">
      {/* Header do grupo */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/40 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Checkbox da franquia */}
        <Checkbox
          checked={allSelected}
          // @ts-ignore - indeterminate é suportado pelo browser
          ref={(el) => el && (el.indeterminate = someSelected)}
          onCheckedChange={() => onToggleFranchise(group.entries)}
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Ícone de expandir */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        
        {/* Info da franquia */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{group.baseName}</span>
            <Badge variant="secondary" className="text-xs">
              {group.totalEntries} {group.totalEntries === 1 ? 'anime' : 'animes'}
            </Badge>
          </div>
          
          {/* Barra de progresso */}
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPercent} className="h-1.5 flex-1 max-w-32" />
            <span className="text-xs text-muted-foreground">
              {group.completedCount}/{group.totalEntries}
            </span>
            {group.averageRating && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {group.averageRating}
              </span>
            )}
          </div>
        </div>
        
        {/* Badges de tipo */}
        <div className="hidden sm:flex items-center gap-1">
          {group.types.mainSeries.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Tv className="h-3 w-3" />
              {group.types.mainSeries.length}
            </Badge>
          )}
          {group.types.seasons.length > 0 && (
            <Badge variant="outline" className="text-xs">
              +{group.types.seasons.length} temp
            </Badge>
          )}
          {group.types.movies.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Film className="h-3 w-3" />
              {group.types.movies.length}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Lista expandida de animes */}
      {isExpanded && (
        <div className="border-t border-border/30 bg-background/50">
          {group.entries.map((entry) => (
            <div 
              key={entry.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/30 transition-colors ml-6"
            >
              <Checkbox
                checked={selectedIds.has(entry.id)}
                onCheckedChange={() => onToggleEntry(entry.id)}
              />
              
              <img 
                src={entry.image_url || '/placeholder.svg'} 
                alt={entry.title}
                className="w-8 h-10 rounded object-cover"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getStatusIcon(entry.status)}
                  <span className="text-sm truncate">{entry.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {entry.episodes_watched !== null && entry.total_episodes && (
                    <span>{entry.episodes_watched}/{entry.total_episodes} eps</span>
                  )}
                  {entry.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {entry.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FranchiseListViewProps {
  groups: FranchiseGroup[];
  selectedIds: Set<string>;
  onToggleEntry: (entryId: string) => void;
  onToggleFranchise: (entries: AnimeEntry[]) => void;
  maxVisible?: number;
}

/**
 * Lista de grupos de franquia
 */
export function FranchiseListView({ 
  groups, 
  selectedIds, 
  onToggleEntry,
  onToggleFranchise,
  maxVisible = 10
}: FranchiseListViewProps) {
  const visibleGroups = groups.slice(0, maxVisible);
  const hiddenCount = Math.max(0, groups.length - maxVisible);
  
  return (
    <div className="space-y-2">
      {visibleGroups.map((group) => (
        <FranchiseGroupView
          key={group.baseName}
          group={group}
          selectedIds={selectedIds}
          onToggleEntry={onToggleEntry}
          onToggleFranchise={onToggleFranchise}
        />
      ))}
      
      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          +{hiddenCount} franquias...
        </p>
      )}
    </div>
  );
}
