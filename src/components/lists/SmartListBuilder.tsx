import { useState, useMemo, useCallback } from 'react';
import { 
  Sparkles, Lock, Globe, Filter, Layers, List, 
  X, RefreshCw, ChevronDown, ChevronUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useCreateList, useAddToList } from '@/hooks/useCustomLists';
import { 
  groupByFranchise, 
  getCompletedFranchises, 
  getInProgressFranchises,
  getMultiSeasonFranchises,
  getHighRatedFranchises,
  getNearlyCompleteFranchises,
  getAbandonedFranchises,
  getFranchisesBySize,
  detectAnimeType,
  type AnimeEntry,
  type FranchiseGroup 
} from '@/lib/franchiseDetector';
import { FranchiseListView } from './FranchiseGroupView';
import { FranchiseSearch } from './FranchiseSearch';
import { SmartListStats } from './SmartListStats';
import { MissingAnimeSuggestion } from './MissingAnimeSuggestion';
import { SmartListTemplates, type SmartListTemplate } from './SmartListTemplates';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

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

interface SmartListBuilderProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Construtor de listas inteligentes com layout em 2 colunas
 * Inclui detecção de franquias, estatísticas em tempo real e animações
 */
export function SmartListBuilder({ onSuccess, onCancel }: SmartListBuilderProps) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  
  // Modo de visualização
  const [viewMode, setViewMode] = useState<'individual' | 'franchise'>('individual');
  
  // Filtros básicos
  const [selectedStatuses, setSelectedStatuses] = useState<AnimeStatus[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  
  // Filtros de tipo
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['main', 'season', 'movie', 'special']));
  
  // Filtros de franquia
  const [franchiseCriteria, setFranchiseCriteria] = useState<string | null>(null);
  const [franchiseSize, setFranchiseSize] = useState<'small' | 'medium' | 'large' | null>(null);
  
  // Seleção manual de entradas
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Estado de seções colapsáveis
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  const { data: entries } = useAnimeEntries();
  const createList = useCreateList();
  const addToList = useAddToList();

  // Filtrar animes baseado nos critérios básicos
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter((entry) => {
      // Filtro por status
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(entry.status)) {
        return false;
      }

      // Filtro por nota mínima
      if (minRating > 0 && (!entry.rating || entry.rating < minRating)) {
        return false;
      }

      // Filtro por favoritos
      if (onlyFavorites && !entry.is_favorite) {
        return false;
      }

      // Não incluir arquivados
      if (entry.is_archived) {
        return false;
      }
      
      // Filtro por tipo de anime
      const type = detectAnimeType(entry.title);
      if (!selectedTypes.has(type)) {
        return false;
      }

      return true;
    }) as AnimeEntry[];
  }, [entries, selectedStatuses, minRating, onlyFavorites, selectedTypes]);

  // Agrupar por franquia
  const franchiseGroups = useMemo(() => {
    let groups = groupByFranchise(filteredEntries);
    
    // Aplicar critério de franquia
    if (franchiseCriteria === 'completed') {
      groups = getCompletedFranchises(groups);
    } else if (franchiseCriteria === 'in_progress') {
      groups = getInProgressFranchises(groups);
    } else if (franchiseCriteria === 'multi_season') {
      groups = getMultiSeasonFranchises(groups);
    } else if (franchiseCriteria === 'high_rated') {
      groups = getHighRatedFranchises(groups, 4);
    } else if (franchiseCriteria === 'nearly_complete') {
      groups = getNearlyCompleteFranchises(groups);
    } else if (franchiseCriteria === 'abandoned') {
      groups = getAbandonedFranchises(groups);
    }
    
    // Aplicar filtro de tamanho
    if (franchiseSize) {
      groups = getFranchisesBySize(groups, franchiseSize);
    }
    
    return groups;
  }, [filteredEntries, franchiseCriteria, franchiseSize]);

  // Entradas finais baseadas no modo
  const finalEntries = useMemo(() => {
    if (viewMode === 'franchise') {
      return franchiseGroups.flatMap(g => g.entries);
    }
    return filteredEntries;
  }, [viewMode, franchiseGroups, filteredEntries]);

  // Entradas selecionadas
  const selectedEntries = useMemo(() => {
    if (selectedIds.size === 0) {
      return finalEntries;
    }
    return finalEntries.filter(e => selectedIds.has(e.id));
  }, [finalEntries, selectedIds]);

  // Handler para toggle de status
  const handleStatusToggle = useCallback((status: AnimeStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setSelectedIds(new Set());
    setSelectedTemplateId(undefined);
  }, []);

  // Handler para toggle de tipo
  const handleTypeToggle = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
    setSelectedIds(new Set());
  }, []);

  // Handler para toggle de entrada individual
  const handleToggleEntry = useCallback((entryId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  }, []);

  // Handler para toggle de franquia inteira
  const handleToggleFranchise = useCallback((franchiseEntries: AnimeEntry[]) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      const allSelected = franchiseEntries.every(e => newSet.has(e.id));
      
      if (allSelected) {
        franchiseEntries.forEach(e => newSet.delete(e.id));
      } else {
        franchiseEntries.forEach(e => newSet.add(e.id));
      }
      
      return newSet;
    });
  }, []);

  // Handler para selecionar/desmarcar todas as franquias filtradas
  const handleSelectAllFiltered = useCallback((allEntries: AnimeEntry[]) => {
    setSelectedIds((prev) => {
      const allSelected = allEntries.every(e => prev.has(e.id));
      
      if (allSelected) {
        const newSet = new Set(prev);
        allEntries.forEach(e => newSet.delete(e.id));
        return newSet;
      } else {
        const newSet = new Set(prev);
        allEntries.forEach(e => newSet.add(e.id));
        return newSet;
      }
    });
  }, []);

  // Handler para selecionar template
  const handleSelectTemplate = useCallback((template: SmartListTemplate) => {
    setSelectedTemplateId(template.id);
    setName(template.name);
    
    const { criteria } = template;
    
    if (criteria.statuses) {
      setSelectedStatuses(criteria.statuses as AnimeStatus[]);
    } else {
      setSelectedStatuses([]);
    }
    
    if (criteria.minRating !== undefined) {
      setMinRating(criteria.minRating);
    } else {
      setMinRating(0);
    }
    
    setOnlyFavorites(criteria.onlyFavorites || false);
    
    if (criteria.franchiseMode) {
      setViewMode(criteria.franchiseMode);
    } else {
      setViewMode('individual');
    }
    
    if (criteria.franchiseCriteria) {
      setFranchiseCriteria(criteria.franchiseCriteria);
    } else {
      setFranchiseCriteria(null);
    }
    
    if (criteria.franchiseSize) {
      setFranchiseSize(criteria.franchiseSize);
    } else {
      setFranchiseSize(null);
    }
    
    if (criteria.animeTypes) {
      setSelectedTypes(new Set(criteria.animeTypes));
    } else {
      setSelectedTypes(new Set(['main', 'season', 'movie', 'special']));
    }
    
    setSelectedIds(new Set());
  }, []);

  // Handler para limpar todos os filtros
  const handleClearFilters = useCallback(() => {
    setSelectedStatuses([]);
    setMinRating(0);
    setOnlyFavorites(false);
    setSelectedTypes(new Set(['main', 'season', 'movie', 'special']));
    setFranchiseCriteria(null);
    setFranchiseSize(null);
    setSelectedIds(new Set());
    setSelectedTemplateId(undefined);
  }, []);

  // Handler para criar lista inteligente
  const handleCreate = async () => {
    if (!name.trim() || selectedEntries.length === 0) return;

    try {
      const newList = await createList.mutateAsync({
        name: name.trim(),
        description: `Lista inteligente com ${selectedEntries.length} animes`,
        is_public: isPublic,
      });

      for (const entry of selectedEntries) {
        await addToList.mutateAsync({
          listId: newList.id,
          animeEntryId: entry.id,
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao criar lista inteligente:', error);
    }
  };

  // Verifica se há filtros ativos
  const hasActiveFilters = selectedStatuses.length > 0 || 
    minRating > 0 || 
    onlyFavorites || 
    franchiseCriteria !== null || 
    franchiseSize !== null ||
    selectedTypes.size < 4;

  return (
    <div className="space-y-4">
      {/* Templates rápidos */}
      <SmartListTemplates 
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplateId}
        compact
      />

      {/* Layout em 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Coluna Esquerda - Filtros e Preview */}
        <div className="lg:col-span-3 space-y-4">
          {/* Nome da lista */}
          <div className="space-y-2">
            <Label htmlFor="smart-name">Nome da Lista *</Label>
            <Input
              id="smart-name"
              placeholder="Ex: Favoritos 5 Estrelas"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSelectedTemplateId(undefined);
              }}
            />
          </div>

          {/* Modo de visualização */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'individual' | 'franchise')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="gap-2">
                <List className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="franchise" className="gap-2">
                <Layers className="h-4 w-4" />
                Por Franquia
              </TabsTrigger>
            </TabsList>

            {/* Seção de Filtros Colapsável */}
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-between p-2 h-auto"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        Ativos
                      </Badge>
                    )}
                  </div>
                  {isFiltersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  {/* Botão limpar filtros */}
                  {hasActiveFilters && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={handleClearFilters}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Limpar
                      </Button>
                    </div>
                  )}

                  {/* Filtro por Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['watching', 'completed', 'paused', 'dropped', 'not_started'] as AnimeStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusToggle(status)}
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
                            selectedStatuses.includes(status)
                              ? 'border-transparent bg-primary text-primary-foreground'
                              : 'border-border bg-transparent text-foreground hover:bg-secondary'
                          )}
                        >
                          {statusLabels[status]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro por Tipo de Anime */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['main', 'season', 'movie', 'special'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTypeToggle(type)}
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
                            selectedTypes.has(type)
                              ? 'border-transparent bg-primary text-primary-foreground'
                              : 'border-border bg-transparent text-foreground hover:bg-secondary'
                          )}
                        >
                          {animeTypeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro por Nota */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Nota mínima: {minRating > 0 ? `${minRating}★` : 'Qualquer'}
                    </Label>
                    <Slider
                      value={[minRating]}
                      onValueChange={([value]) => {
                        setMinRating(value);
                        setSelectedTemplateId(undefined);
                      }}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Apenas Favoritos */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="only-favorites"
                      checked={onlyFavorites}
                      onCheckedChange={(checked) => {
                        setOnlyFavorites(checked === true);
                        setSelectedTemplateId(undefined);
                      }}
                    />
                    <Label htmlFor="only-favorites" className="text-xs cursor-pointer">
                      Apenas favoritos
                    </Label>
                  </div>

                  {/* Critérios de Franquia (apenas no modo franquia) */}
                  {viewMode === 'franchise' && (
                    <>
                      <div className="space-y-1.5 pt-2 border-t border-border/30">
                        <Label className="text-xs text-muted-foreground">Critério de Franquia</Label>
                        <div className="flex flex-wrap gap-1.5">
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
                              onClick={() => setFranchiseCriteria(value)}
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
                                franchiseCriteria === value
                                  ? 'border-transparent bg-primary text-primary-foreground'
                                  : 'border-border bg-transparent text-foreground hover:bg-secondary'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Filtro por tamanho de franquia */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Tamanho</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { value: null, label: 'Qualquer' },
                            { value: 'small' as const, label: franchiseSizeLabels.small },
                            { value: 'medium' as const, label: franchiseSizeLabels.medium },
                            { value: 'large' as const, label: franchiseSizeLabels.large },
                          ].map(({ value, label }) => (
                            <button
                              key={value || 'any'}
                              type="button"
                              onClick={() => setFranchiseSize(value)}
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
                                franchiseSize === value
                                  ? 'border-transparent bg-primary text-primary-foreground'
                                  : 'border-border bg-transparent text-foreground hover:bg-secondary'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Preview dos resultados - Individual */}
            <TabsContent value="individual" className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Preview ({selectedEntries.length} animes)
                  </Label>
                  {selectedIds.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </Button>
                  )}
                </div>
                
                {filteredEntries.length > 0 ? (
                  <ScrollArea className="h-52 rounded-md border bg-secondary/20">
                    <div className="p-2 space-y-1">
                      <AnimatePresence mode="popLayout">
                        {filteredEntries.slice(0, 25).map((entry, index) => (
                          <motion.div 
                            key={entry.id} 
                            className={cn(
                              "flex items-center gap-2 text-sm p-1.5 rounded hover:bg-secondary/50 transition-colors cursor-pointer",
                              (selectedIds.size === 0 || selectedIds.has(entry.id)) && "bg-primary/5"
                            )}
                            onClick={() => handleToggleEntry(entry.id)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10, scale: 0.9 }}
                            transition={{ duration: 0.15, delay: index * 0.01 }}
                            layout
                          >
                            <Checkbox
                              checked={selectedIds.size === 0 || selectedIds.has(entry.id)}
                              onCheckedChange={() => handleToggleEntry(entry.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <img 
                              src={entry.image_url || '/placeholder.svg'} 
                              alt={entry.title}
                              className="w-6 h-8 rounded object-cover flex-shrink-0"
                            />
                            <span className="truncate flex-1 text-xs">{entry.title}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {entry.rating && (
                                <span className="text-[10px] text-yellow-500">★{entry.rating}</span>
                              )}
                              <Badge variant="outline" className="text-[9px] h-4 px-1">
                                {statusLabels[entry.status as AnimeStatus]}
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {filteredEntries.length > 25 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{filteredEntries.length - 25} animes...
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-40 rounded-md border bg-secondary/20 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters ? 'Nenhum anime encontrado' : 'Selecione filtros'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Preview dos resultados - Franquia */}
            <TabsContent value="franchise" className="mt-4">
              <div className="space-y-3">
                {/* Busca de franquias */}
                <FranchiseSearch
                  franchiseGroups={franchiseGroups}
                  selectedIds={selectedIds}
                  onToggleEntry={handleToggleEntry}
                  onToggleFranchise={handleToggleFranchise}
                  onSelectAllFiltered={handleSelectAllFiltered}
                  placeholder="Buscar franquia..."
                />
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {franchiseGroups.length} franquias ({selectedEntries.length} animes)
                  </Label>
                  {selectedIds.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </Button>
                  )}
                </div>
                
                {franchiseGroups.length > 0 ? (
                  <ScrollArea className="h-48 rounded-md border bg-secondary/20 p-2">
                    <FranchiseListView
                      groups={franchiseGroups}
                      selectedIds={selectedIds}
                      onToggleEntry={handleToggleEntry}
                      onToggleFranchise={handleToggleFranchise}
                      maxVisible={15}
                    />
                  </ScrollArea>
                ) : (
                  <div className="h-40 rounded-md border bg-secondary/20 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters ? 'Nenhuma franquia encontrada' : 'Selecione filtros'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna Direita - Estatísticas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="sticky top-0 space-y-4">
            {/* Card de estatísticas */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Estatísticas</span>
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                  {selectedEntries.length} animes
                </Badge>
              </div>
              <SmartListStats entries={selectedEntries} compact />
            </div>

            {/* Sugestão de animes faltando */}
            {viewMode === 'franchise' && selectedIds.size > 0 && (
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <MissingAnimeSuggestion
                  franchiseGroups={franchiseGroups}
                  selectedIds={selectedIds}
                />
              </div>
            )}

            {/* Toggle público/privado */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="smart-public" className="cursor-pointer text-sm">
                  {isPublic ? 'Pública' : 'Privada'}
                </Label>
              </div>
              <Switch
                id="smart-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={handleCreate} 
          disabled={!name.trim() || selectedEntries.length === 0 || createList.isPending}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {createList.isPending ? 'Criando...' : `Criar com ${selectedEntries.length} animes`}
        </Button>
      </div>
    </div>
  );
}