import { useState, useMemo } from 'react';
import { SlidersHorizontal, ArrowUpDown, X, Star, Heart, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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

/**
 * Opções de filtragem avançada usadas na Minha Lista.
 * Novos campos (genres/studios/types/year) são opcionais para manter compat.
 */
export interface FilterOptions {
  onlyFavorites: boolean;
  minRating: number;
  hasNotes: boolean;
  selectedGenres: string[];
  selectedStudios: string[];
  selectedTypes: string[];
  yearFrom: number | null;
  yearTo: number | null;
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
  /** Opções disponíveis derivadas dos animes da lista */
  availableGenres?: string[];
  availableStudios?: string[];
  availableTypes?: string[];
  availableYears?: number[];
}

const sortLabels: Record<SortOption, string> = {
  title: 'Título',
  rating: 'Nota',
  progress: 'Progresso',
  updated: 'Atualizado',
  added: 'Adicionado',
};

/** Traduz tipos de anime para PT-BR nos chips */
const typeLabels: Record<string, string> = {
  TV: 'TV',
  Movie: 'Filme',
  OVA: 'OVA',
  ONA: 'ONA',
  Special: 'Especial',
  Music: 'Música',
};

/**
 * Componente de filtros avançados e ordenação da Minha Lista.
 * Suporta filtros por favoritos, nota, anotações, gêneros, estúdios, tipo e ano.
 */
export function AdvancedFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  availableGenres = [],
  availableStudios = [],
  availableTypes = [],
  availableYears = [],
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
  const [studioSearch, setStudioSearch] = useState('');

  // Contagem de filtros ativos para o badge do botão
  const activeFilterCount =
    (filters.onlyFavorites ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.hasNotes ? 1 : 0) +
    filters.selectedGenres.length +
    filters.selectedStudios.length +
    filters.selectedTypes.length +
    (filters.yearFrom !== null || filters.yearTo !== null ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Handler para resetar todos os filtros
  const handleReset = () => {
    onFiltersChange({
      onlyFavorites: false,
      minRating: 0,
      hasNotes: false,
      selectedGenres: [],
      selectedStudios: [],
      selectedTypes: [],
      yearFrom: null,
      yearTo: null,
    });
  };

  // Alterna item em array de filtro (gêneros, estúdios, tipos)
  const toggleInArray = (key: 'selectedGenres' | 'selectedStudios' | 'selectedTypes', value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  };

  // Listas filtradas pela busca dentro do popover
  const filteredGenres = useMemo(() => {
    const q = genreSearch.trim().toLowerCase();
    return q ? availableGenres.filter((g) => g.toLowerCase().includes(q)) : availableGenres;
  }, [availableGenres, genreSearch]);

  const filteredStudios = useMemo(() => {
    const q = studioSearch.trim().toLowerCase();
    return q ? availableStudios.filter((s) => s.toLowerCase().includes(q)) : availableStudios;
  }, [availableStudios, studioSearch]);

  const minYearOption = availableYears.length ? Math.min(...availableYears) : null;
  const maxYearOption = availableYears.length ? Math.max(...availableYears) : null;

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
          {(['title', 'rating', 'progress', 'updated', 'added'] as SortOption[]).flatMap((option) => [
            <SelectItem key={`${option}-asc`} value={`${option}-asc`}>
              {sortLabels[option]} (A-Z)
            </SelectItem>,
            <SelectItem key={`${option}-desc`} value={`${option}-desc`}>
              {sortLabels[option]} (Z-A)
            </SelectItem>,
          ])}
        </SelectContent>
      </Select>

      {/* Filtros */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <SlidersHorizontal className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[92vw] max-w-sm sm:w-96 p-0"
          align="end"
          sideOffset={8}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h4 className="font-medium text-sm">Filtros Avançados</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpar tudo
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-5">
              {/* Apenas Favoritos */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className={filters.onlyFavorites ? 'h-4 w-4 fill-red-500 text-red-500' : 'h-4 w-4'} />
                  <Label htmlFor="favorites" className="text-sm cursor-pointer">
                    Apenas favoritos
                  </Label>
                </div>
                <Switch
                  id="favorites"
                  checked={filters.onlyFavorites}
                  onCheckedChange={(checked) => onFiltersChange({ ...filters, onlyFavorites: checked })}
                />
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
                  onCheckedChange={(checked) => onFiltersChange({ ...filters, hasNotes: checked })}
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
                    {filters.minRating > 0 ? `${filters.minRating}★+` : 'Qualquer'}
                  </span>
                </div>
                <Slider
                  value={[filters.minRating]}
                  onValueChange={([value]) => onFiltersChange({ ...filters, minRating: value })}
                  max={5}
                  step={1}
                />
              </div>

              {/* Tipos */}
              {availableTypes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Tipo</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTypes.map((type) => {
                      const active = filters.selectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleInArray('selectedTypes', type)}
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                            active
                              ? 'border-transparent bg-primary text-primary-foreground'
                              : 'border-border bg-transparent hover:bg-secondary'
                          )}
                        >
                          {typeLabels[type] ?? type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gêneros */}
              {availableGenres.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">
                      Gêneros
                      {filters.selectedGenres.length > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({filters.selectedGenres.length})
                        </span>
                      )}
                    </Label>
                    {filters.selectedGenres.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => onFiltersChange({ ...filters, selectedGenres: [] })}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      placeholder="Buscar gênero..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2 flex flex-wrap gap-1.5">
                    {filteredGenres.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1 py-2">Nenhum gênero encontrado</p>
                    ) : (
                      filteredGenres.map((genre) => {
                        const active = filters.selectedGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleInArray('selectedGenres', genre)}
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors',
                              active
                                ? 'border-transparent bg-primary text-primary-foreground'
                                : 'border-border bg-transparent hover:bg-secondary'
                            )}
                          >
                            {genre}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Estúdios */}
              {availableStudios.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">
                      Estúdios
                      {filters.selectedStudios.length > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({filters.selectedStudios.length})
                        </span>
                      )}
                    </Label>
                    {filters.selectedStudios.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => onFiltersChange({ ...filters, selectedStudios: [] })}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={studioSearch}
                      onChange={(e) => setStudioSearch(e.target.value)}
                      placeholder="Buscar estúdio..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2 flex flex-wrap gap-1.5">
                    {filteredStudios.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1 py-2">Nenhum estúdio encontrado</p>
                    ) : (
                      filteredStudios.map((studio) => {
                        const active = filters.selectedStudios.includes(studio);
                        return (
                          <button
                            key={studio}
                            type="button"
                            onClick={() => toggleInArray('selectedStudios', studio)}
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors',
                              active
                                ? 'border-transparent bg-primary text-primary-foreground'
                                : 'border-border bg-transparent hover:bg-secondary'
                            )}
                          >
                            {studio}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Faixa de ano */}
              {minYearOption !== null && maxYearOption !== null && minYearOption !== maxYearOption && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Ano</Label>
                    <span className="text-xs text-muted-foreground">
                      {filters.yearFrom ?? minYearOption} – {filters.yearTo ?? maxYearOption}
                    </span>
                  </div>
                  <Slider
                    min={minYearOption}
                    max={maxYearOption}
                    step={1}
                    value={[filters.yearFrom ?? minYearOption, filters.yearTo ?? maxYearOption]}
                    onValueChange={([from, to]) =>
                      onFiltersChange({ ...filters, yearFrom: from, yearTo: to })
                    }
                  />
                </div>
              )}

              {/* Resumo dos filtros ativos */}
              {hasActiveFilters && (
                <div className="pt-3 border-t">
                  <div className="flex flex-wrap gap-1">
                    {filters.onlyFavorites && <Badge variant="secondary" className="text-xs">Favoritos</Badge>}
                    {filters.hasNotes && <Badge variant="secondary" className="text-xs">Com notas</Badge>}
                    {filters.minRating > 0 && (
                      <Badge variant="secondary" className="text-xs">{filters.minRating}★+</Badge>
                    )}
                    {filters.selectedTypes.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{typeLabels[t] ?? t}</Badge>
                    ))}
                    {filters.selectedGenres.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                    ))}
                    {filters.selectedStudios.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {(filters.yearFrom !== null || filters.yearTo !== null) && (
                      <Badge variant="secondary" className="text-xs">
                        {filters.yearFrom ?? minYearOption}–{filters.yearTo ?? maxYearOption}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
