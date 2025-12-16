import { useState } from 'react';
import { SlidersHorizontal, ArrowUpDown, X, Star, Heart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortOption = 'title' | 'rating' | 'progress' | 'updated' | 'added';
export type SortDirection = 'asc' | 'desc';

export interface FilterOptions {
  onlyFavorites: boolean;
  minRating: number;
  hasNotes: boolean;
}

export interface SortOptions {
  sortBy: SortOption;
  direction: SortDirection;
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  sort: SortOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onSortChange: (sort: SortOptions) => void;
}

const sortLabels: Record<SortOption, string> = {
  title: 'Título',
  rating: 'Nota',
  progress: 'Progresso',
  updated: 'Atualizado',
  added: 'Adicionado',
};

/**
 * Componente de filtros avançados e ordenação
 */
export function AdvancedFilters({ 
  filters, 
  sort, 
  onFiltersChange, 
  onSortChange 
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = filters.onlyFavorites || filters.minRating > 0 || filters.hasNotes;
  const activeFilterCount = [
    filters.onlyFavorites,
    filters.minRating > 0,
    filters.hasNotes,
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({
      onlyFavorites: false,
      minRating: 0,
      hasNotes: false,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Ordenação */}
      <Select
        value={`${sort.sortBy}-${sort.direction}`}
        onValueChange={(value) => {
          const [sortBy, direction] = value.split('-') as [SortOption, SortDirection];
          onSortChange({ sortBy, direction });
        }}
      >
        <SelectTrigger className="w-[160px] h-9">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {(['title', 'rating', 'progress', 'updated', 'added'] as SortOption[]).map((option) => (
            <>
              <SelectItem key={`${option}-asc`} value={`${option}-asc`}>
                {sortLabels[option]} (A-Z)
              </SelectItem>
              <SelectItem key={`${option}-desc`} value={`${option}-desc`}>
                {sortLabels[option]} (Z-A)
              </SelectItem>
            </>
          ))}
        </SelectContent>
      </Select>

      {/* Filtros */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <SlidersHorizontal className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros Avançados</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Apenas Favoritos */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className={filters.onlyFavorites ? "h-4 w-4 fill-red-500 text-red-500" : "h-4 w-4"} />
                <Label htmlFor="favorites" className="text-sm cursor-pointer">
                  Apenas favoritos
                </Label>
              </div>
              <Switch
                id="favorites"
                checked={filters.onlyFavorites}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, onlyFavorites: checked })
                }
              />
            </div>

            {/* Nota Mínima */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <Label className="text-sm">Nota mínima</Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {filters.minRating > 0 ? `${filters.minRating}+` : 'Qualquer'}
                </span>
              </div>
              <Slider
                value={[filters.minRating]}
                onValueChange={([value]) => 
                  onFiltersChange({ ...filters, minRating: value })
                }
                max={5}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Qualquer</span>
                <span>5 ★</span>
              </div>
            </div>

            {/* Com Notas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <Label htmlFor="notes" className="text-sm cursor-pointer">
                  Com anotações
                </Label>
              </div>
              <Switch
                id="notes"
                checked={filters.hasNotes}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, hasNotes: checked })
                }
              />
            </div>

            {/* Indicador de filtros ativos */}
            {hasActiveFilters && (
              <div className="pt-2 border-t">
                <div className="flex flex-wrap gap-1">
                  {filters.onlyFavorites && (
                    <Badge variant="secondary" className="text-xs">Favoritos</Badge>
                  )}
                  {filters.minRating > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {filters.minRating}+ estrelas
                    </Badge>
                  )}
                  {filters.hasNotes && (
                    <Badge variant="secondary" className="text-xs">Com notas</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
