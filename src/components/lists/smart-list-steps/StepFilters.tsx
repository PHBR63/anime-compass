import { useCallback } from 'react';
import { RefreshCw, List, Layers, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

// Labels para tipos de anime
const animeTypeLabels = {
  main: 'Série',
  season: 'Temporada',
  movie: 'Filme',
  special: 'OVA',
};

// Labels para tamanho de franquia
const franchiseSizeLabels = {
  small: 'Curtas (<25)',
  medium: 'Médias (25-50)',
  large: 'Longas (50+)',
};

export interface FilterState {
  name: string;
  viewMode: 'individual' | 'franchise';
  selectedStatuses: AnimeStatus[];
  minRating: number;
  onlyFavorites: boolean;
  selectedTypes: Set<string>;
  franchiseCriteria: string | null;
  franchiseSize: 'small' | 'medium' | 'large' | null;
}

interface StepFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  totalAnimes: number;
}

/**
 * Etapa 2: Configuração de filtros
 * Layout vertical para máxima clareza
 */
export function StepFilters({ filters, onFiltersChange, totalAnimes }: StepFiltersProps) {
  const { 
    name, 
    viewMode, 
    selectedStatuses, 
    minRating, 
    onlyFavorites, 
    selectedTypes, 
    franchiseCriteria, 
    franchiseSize 
  } = filters;

  // Handler para toggle de status
  const handleStatusToggle = useCallback((status: AnimeStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    onFiltersChange({ selectedStatuses: newStatuses });
  }, [selectedStatuses, onFiltersChange]);

  // Handler para toggle de tipo
  const handleTypeToggle = useCallback((type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    onFiltersChange({ selectedTypes: newTypes });
  }, [selectedTypes, onFiltersChange]);

  // Handler para limpar todos os filtros
  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      selectedStatuses: [],
      minRating: 0,
      onlyFavorites: false,
      selectedTypes: new Set(['main', 'season', 'movie', 'special']),
      franchiseCriteria: null,
      franchiseSize: null,
    });
  }, [onFiltersChange]);

  // Verifica se há filtros ativos
  const hasActiveFilters = selectedStatuses.length > 0 || 
    minRating > 0 || 
    onlyFavorites || 
    franchiseCriteria !== null || 
    franchiseSize !== null ||
    selectedTypes.size < 4;

  return (
    <div className="space-y-5 pb-2">
      {/* Nome da lista */}
      <div className="space-y-2">
        <Label htmlFor="smart-name" className="text-sm font-medium">
          Nome da Lista *
        </Label>
        <Input
          id="smart-name"
          placeholder="Ex: Favoritos 5 Estrelas"
          value={name}
          onChange={(e) => onFiltersChange({ name: e.target.value })}
          className="h-11"
        />
      </div>

      {/* Modo de visualização */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Modo de Visualização</Label>
        <Tabs 
          value={viewMode} 
          onValueChange={(v) => onFiltersChange({ viewMode: v as 'individual' | 'franchise' })}
        >
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="individual" className="gap-2 h-full">
              <List className="h-4 w-4" />
              Individual
            </TabsTrigger>
            <TabsTrigger value="franchise" className="gap-2 h-full">
              <Layers className="h-4 w-4" />
              Por Franquia
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Divider com contador */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <Badge variant="secondary" className="text-xs">
          {totalAnimes} animes
        </Badge>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Filtro por Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Status</Label>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-muted-foreground"
              onClick={handleClearFilters}
            >
              <RefreshCw className="h-3 w-3" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['watching', 'completed', 'paused', 'dropped', 'not_started'] as AnimeStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusToggle(status)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                selectedStatuses.includes(status)
                  ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/50'
              )}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por Tipo de Anime */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de Anime</Label>
        <div className="flex flex-wrap gap-2">
          {(['main', 'season', 'movie', 'special'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeToggle(type)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                selectedTypes.has(type)
                  ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/50'
              )}
            >
              {animeTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por Nota e Favoritos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nota mínima */}
        <div className="space-y-2 p-3 rounded-lg border bg-secondary/20">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <Label className="text-sm">
              Nota mínima: {minRating > 0 ? `${minRating}★` : 'Qualquer'}
            </Label>
          </div>
          <Slider
            value={[minRating]}
            onValueChange={([value]) => onFiltersChange({ minRating: value })}
            max={5}
            step={1}
            className="w-full"
          />
        </div>

        {/* Apenas Favoritos */}
        <div className="space-y-2 p-3 rounded-lg border bg-secondary/20">
          <div className="flex items-center gap-3">
            <Checkbox
              id="only-favorites"
              checked={onlyFavorites}
              onCheckedChange={(checked) => onFiltersChange({ onlyFavorites: checked === true })}
            />
            <div className="flex items-center gap-2">
              <Heart className={cn("h-4 w-4", onlyFavorites ? "text-red-500 fill-red-500" : "text-muted-foreground")} />
              <Label htmlFor="only-favorites" className="text-sm cursor-pointer">
                Apenas favoritos
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Critérios de Franquia (apenas no modo franquia) */}
      {viewMode === 'franchise' && (
        <div className="space-y-4 p-4 rounded-lg border border-dashed bg-secondary/10">
          <Label className="text-sm font-medium">Filtros de Franquia</Label>
          
          {/* Critério de Franquia */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Critério</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: null, label: 'Todas' },
                { value: 'completed', label: 'Completas' },
                { value: 'in_progress', label: 'Em Andamento' },
                { value: 'nearly_complete', label: 'Quase' },
                { value: 'multi_season', label: 'Multi-temp' },
                { value: 'high_rated', label: '4+ ★' },
                { value: 'abandoned', label: 'Abandonadas' },
              ].map(({ value, label }) => (
                <button
                  key={value || 'all'}
                  type="button"
                  onClick={() => onFiltersChange({ franchiseCriteria: value })}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                    franchiseCriteria === value
                      ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tamanho de franquia */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tamanho</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: null, label: 'Qualquer' },
                { value: 'small' as const, label: franchiseSizeLabels.small },
                { value: 'medium' as const, label: franchiseSizeLabels.medium },
                { value: 'large' as const, label: franchiseSizeLabels.large },
              ].map(({ value, label }) => (
                <button
                  key={value || 'any'}
                  type="button"
                  onClick={() => onFiltersChange({ franchiseSize: value })}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                    franchiseSize === value
                      ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
