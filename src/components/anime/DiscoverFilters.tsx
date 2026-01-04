/**
 * Componente de filtros avançados para a página Descobrir
 * Permite filtrar por gênero, estúdio, ano, tipo e ordenação
 */

import { useState } from 'react';
import { 
  SlidersHorizontal, 
  X, 
  Calendar, 
  Film, 
  Building2, 
  Star,
  ArrowUpDown,
  ChevronDown,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useAnimeGenres, useAnimeStudios } from '@/hooks/useAnimeApi';
import { 
  type DiscoverFilters, 
  type DiscoverSort,
  ANIME_TYPES, 
  ANIME_STATUSES,
  getAvailableYears 
} from '@/hooks/useAdvancedAnimeFilters';

interface DiscoverFiltersProps {
  filters: DiscoverFilters;
  sort: DiscoverSort;
  onFiltersChange: (filters: DiscoverFilters) => void;
  onSortChange: (sort: DiscoverSort) => void;
  onClear: () => void;
}

// Rótulos para ordenação
const sortLabels: Record<string, string> = {
  score: 'Nota',
  popularity: 'Popularidade',
  year: 'Ano',
  title: 'Título',
};

/**
 * Componente de filtros avançados em sheet (drawer)
 */
export function DiscoverFiltersSheet({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onClear,
}: DiscoverFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(true);
  const [studioOpen, setStudioOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  // Buscar gêneros e estúdios do catálogo
  const { data: genres = [] } = useAnimeGenres();
  const { data: studios = [] } = useAnimeStudios();
  const years = getAvailableYears();

  // Conta filtros ativos
  const activeFiltersCount = [
    filters.genre,
    filters.studio,
    filters.yearMin || filters.yearMax,
    filters.type,
    filters.status,
    filters.scoreMin,
    filters.hideInList,
  ].filter(Boolean).length;

  // Encontra nomes dos filtros selecionados
  const selectedGenreName = genres.find(g => g.mal_id === filters.genre)?.name;
  const selectedStudioName = studios.find(s => s.mal_id === filters.studio)?.name;
  const selectedTypeName = ANIME_TYPES.find(t => t.value === filters.type)?.label;
  const selectedStatusName = ANIME_STATUSES.find(s => s.value === filters.status)?.label;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Filtros Avançados
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {/* Toggle para ocultar animes já na lista */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
              <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span>Ocultar animes da minha lista</span>
                  <p className="text-xs text-muted-foreground font-normal">
                    Esconde animes que você já adicionou
                  </p>
                </div>
              </Label>
              <Switch
                checked={filters.hideInList || false}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, hideInList: checked })}
              />
            </div>

            {/* Ordenação */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <ArrowUpDown className="h-4 w-4" />
                Ordenar por
              </Label>
              <div className="flex gap-2">
                <Select
                  value={sort.field}
                  onValueChange={(value) => onSortChange({ ...sort, field: value as DiscoverSort['field'] })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sortLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort.order}
                  onValueChange={(value) => onSortChange({ ...sort, order: value as 'asc' | 'desc' })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Maior</SelectItem>
                    <SelectItem value="asc">Menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nota mínima */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Star className="h-4 w-4" />
                  Nota mínima
                </Label>
                <span className="text-sm text-muted-foreground">
                  {filters.scoreMin ? `${filters.scoreMin}+` : 'Qualquer'}
                </span>
              </div>
              <Slider
                value={[filters.scoreMin || 0]}
                onValueChange={([value]) => onFiltersChange({ ...filters, scoreMin: value || undefined })}
                max={9}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Qualquer</span>
                <span>9+</span>
              </div>
            </div>

            {/* Gêneros */}
            <Collapsible open={genreOpen} onOpenChange={setGenreOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                  <span className="flex items-center gap-2 font-medium">
                    <Film className="h-4 w-4" />
                    Gênero
                    {selectedGenreName && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {selectedGenreName}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${genreOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {genres.slice(0, 30).map((genre) => (
                    <Badge
                      key={genre.mal_id}
                      variant={filters.genre === genre.mal_id ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        genre: filters.genre === genre.mal_id ? undefined : genre.mal_id 
                      })}
                    >
                      {genre.name}
                      {genre.count && <span className="ml-1 opacity-60">({genre.count})</span>}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Estúdios */}
            <Collapsible open={studioOpen} onOpenChange={setStudioOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                  <span className="flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4" />
                    Estúdio
                    {selectedStudioName && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {selectedStudioName}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${studioOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {studios.slice(0, 50).map((studio) => (
                    <Badge
                      key={studio.mal_id}
                      variant={filters.studio === studio.mal_id ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        studio: filters.studio === studio.mal_id ? undefined : studio.mal_id 
                      })}
                    >
                      {studio.name}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Ano */}
            <Collapsible open={yearOpen} onOpenChange={setYearOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                  <span className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4" />
                    Ano
                    {(filters.yearMin || filters.yearMax) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {filters.yearMin && filters.yearMax 
                          ? `${filters.yearMin} - ${filters.yearMax}`
                          : filters.yearMin 
                            ? `${filters.yearMin}+` 
                            : `Até ${filters.yearMax}`
                        }
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <Select
                      value={filters.yearMin?.toString() || ''}
                      onValueChange={(value) => onFiltersChange({ ...filters, yearMin: value ? Number(value) : undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer</SelectItem>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <Select
                      value={filters.yearMax?.toString() || ''}
                      onValueChange={(value) => onFiltersChange({ ...filters, yearMax: value ? Number(value) : undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer</SelectItem>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tipo e Status */}
            <Collapsible open={typeOpen} onOpenChange={setTypeOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                  <span className="flex items-center gap-2 font-medium">
                    <Film className="h-4 w-4" />
                    Tipo / Status
                    {(selectedTypeName || selectedStatusName) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {[selectedTypeName, selectedStatusName].filter(Boolean).join(', ')}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${typeOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ANIME_TYPES.map((type) => (
                      <Badge
                        key={type.value}
                        variant={filters.type === type.value ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => onFiltersChange({ 
                          ...filters, 
                          type: filters.type === type.value ? undefined : type.value 
                        })}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ANIME_STATUSES.map((status) => (
                      <Badge
                        key={status.value}
                        variant={filters.status === status.value ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => onFiltersChange({ 
                          ...filters, 
                          status: filters.status === status.value ? undefined : status.value 
                        })}
                      >
                        {status.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <SheetFooter className="px-4 py-3 border-t gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={onClear} className="flex-1 gap-2">
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
          <Button onClick={() => setIsOpen(false)} className="flex-1">
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Componente de badges com filtros ativos
 */
export function ActiveFiltersBadges({
  filters,
  onFiltersChange,
}: {
  filters: DiscoverFilters;
  onFiltersChange: (filters: DiscoverFilters) => void;
}) {
  const { data: genres = [] } = useAnimeGenres();
  const { data: studios = [] } = useAnimeStudios();

  const selectedGenreName = genres.find(g => g.mal_id === filters.genre)?.name;
  const selectedStudioName = studios.find(s => s.mal_id === filters.studio)?.name;
  const selectedTypeName = ANIME_TYPES.find(t => t.value === filters.type)?.label;
  const selectedStatusName = ANIME_STATUSES.find(s => s.value === filters.status)?.label;

  const hasFilters = filters.genre || filters.studio || filters.yearMin || 
    filters.yearMax || filters.type || filters.status || filters.scoreMin || filters.hideInList;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {selectedGenreName && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {selectedGenreName}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onFiltersChange({ ...filters, genre: undefined })}
          />
        </Badge>
      )}
      {selectedStudioName && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {selectedStudioName}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onFiltersChange({ ...filters, studio: undefined })}
          />
        </Badge>
      )}
      {(filters.yearMin || filters.yearMax) && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {filters.yearMin && filters.yearMax 
            ? `${filters.yearMin} - ${filters.yearMax}`
            : filters.yearMin 
              ? `${filters.yearMin}+` 
              : `Até ${filters.yearMax}`
          }
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onFiltersChange({ ...filters, yearMin: undefined, yearMax: undefined })}
          />
        </Badge>
      )}
      {selectedTypeName && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {selectedTypeName}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onFiltersChange({ ...filters, type: undefined })}
          />
        </Badge>
      )}
      {selectedStatusName && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {selectedStatusName}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onFiltersChange({ ...filters, status: undefined })}
          />
        </Badge>
      )}
      {filters.scoreMin && (
        <Badge variant="secondary" className="gap-1 text-xs">
          Nota {filters.scoreMin}+
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onFiltersChange({ ...filters, scoreMin: undefined })}
          />
        </Badge>
      )}
      {filters.hideInList && (
        <Badge variant="secondary" className="gap-1 text-xs bg-primary/20">
          <EyeOff className="h-3 w-3" />
          Ocultos da lista
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onFiltersChange({ ...filters, hideInList: undefined })}
          />
        </Badge>
      )}
    </div>
  );
}
