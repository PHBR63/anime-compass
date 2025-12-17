import { useState, useMemo } from 'react';
import { Sparkles, Lock, Globe, Filter, Layers, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useCreateList, useAddToList } from '@/hooks/useCustomLists';
import { 
  groupByFranchise, 
  getCompletedFranchises, 
  getInProgressFranchises,
  getMultiSeasonFranchises,
  getHighRatedFranchises,
  detectAnimeType,
  type AnimeEntry,
  type FranchiseGroup 
} from '@/lib/franchiseDetector';
import { FranchiseListView } from './FranchiseGroupView';
import { SmartListTemplates, SMART_LIST_TEMPLATES, type SmartListTemplate } from './SmartListTemplates';
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
  main: 'Série Principal',
  season: 'Temporada',
  movie: 'Filme',
  special: 'OVA/Especial',
};

interface SmartListBuilderProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Construtor de listas inteligentes com detecção de franquias
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
  
  // Critérios de franquia
  const [franchiseCriteria, setFranchiseCriteria] = useState<string | null>(null);
  
  // Seleção manual de entradas
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    const groups = groupByFranchise(filteredEntries);
    
    // Aplicar critério de franquia
    if (franchiseCriteria === 'completed') {
      return getCompletedFranchises(groups);
    }
    if (franchiseCriteria === 'in_progress') {
      return getInProgressFranchises(groups);
    }
    if (franchiseCriteria === 'multi_season') {
      return getMultiSeasonFranchises(groups);
    }
    if (franchiseCriteria === 'high_rated') {
      return getHighRatedFranchises(groups, 4);
    }
    
    return groups;
  }, [filteredEntries, franchiseCriteria]);

  // Entradas finais baseadas no modo
  const finalEntries = useMemo(() => {
    if (viewMode === 'franchise') {
      // Retornar todas as entradas dos grupos filtrados
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
  const handleStatusToggle = (status: AnimeStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setSelectedIds(new Set());
    setSelectedTemplateId(undefined);
  };

  // Handler para toggle de tipo
  const handleTypeToggle = (type: string) => {
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
  };

  // Handler para toggle de entrada individual
  const handleToggleEntry = (entryId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Handler para toggle de franquia inteira
  const handleToggleFranchise = (franchiseEntries: AnimeEntry[]) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      const allSelected = franchiseEntries.every(e => newSet.has(e.id));
      
      if (allSelected) {
        // Deselecionar todos
        franchiseEntries.forEach(e => newSet.delete(e.id));
      } else {
        // Selecionar todos
        franchiseEntries.forEach(e => newSet.add(e.id));
      }
      
      return newSet;
    });
  };

  // Handler para selecionar template
  const handleSelectTemplate = (template: SmartListTemplate) => {
    setSelectedTemplateId(template.id);
    setName(template.name);
    
    // Aplicar critérios do template
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
    
    if (criteria.animeTypes) {
      setSelectedTypes(new Set(criteria.animeTypes));
    } else {
      setSelectedTypes(new Set(['main', 'season', 'movie', 'special']));
    }
    
    setSelectedIds(new Set());
  };

  // Handler para criar lista inteligente
  const handleCreate = async () => {
    if (!name.trim() || selectedEntries.length === 0) return;

    try {
      // Criar a lista
      const newList = await createList.mutateAsync({
        name: name.trim(),
        description: `Lista inteligente com ${selectedEntries.length} animes`,
        is_public: isPublic,
      });

      // Adicionar os animes à lista
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

  const hasFilters = selectedStatuses.length > 0 || minRating > 0 || onlyFavorites || franchiseCriteria;

  return (
    <div className="space-y-4">
      {/* Templates rápidos */}
      <SmartListTemplates 
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplateId}
      />

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

        {/* Filtros */}
        <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50 mt-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Critérios de Seleção
          </div>

          {/* Filtro por Status */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="flex flex-wrap gap-2">
              {(['watching', 'completed', 'paused', 'dropped', 'not_started'] as AnimeStatus[]).map((status) => (
                <Badge
                  key={status}
                  variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleStatusToggle(status)}
                >
                  {statusLabels[status]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Filtro por Tipo de Anime */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tipo de Conteúdo</Label>
            <div className="flex flex-wrap gap-2">
              {(['main', 'season', 'movie', 'special'] as const).map((type) => (
                <Badge
                  key={type}
                  variant={selectedTypes.has(type) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleTypeToggle(type)}
                >
                  {animeTypeLabels[type]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Filtro por Nota */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Nota mínima: {minRating > 0 ? `${minRating} estrelas` : 'Qualquer'}
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
            <Label htmlFor="only-favorites" className="text-sm cursor-pointer">
              Apenas favoritos
            </Label>
          </div>

          {/* Critérios de Franquia (apenas no modo franquia) */}
          {viewMode === 'franchise' && (
            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label className="text-xs text-muted-foreground">Critério de Franquia</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: null, label: 'Todas' },
                  { value: 'completed', label: 'Completas' },
                  { value: 'in_progress', label: 'Em Andamento' },
                  { value: 'multi_season', label: 'Multi-temporada' },
                  { value: 'high_rated', label: 'Nota Alta (4+)' },
                ].map(({ value, label }) => (
                  <Badge
                    key={value || 'all'}
                    variant={franchiseCriteria === value ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => setFranchiseCriteria(value)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview dos resultados */}
        <TabsContent value="individual" className="mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Preview ({selectedEntries.length} anime{selectedEntries.length !== 1 && 's'})
              </Label>
              {!hasFilters && (
                <span className="text-xs text-amber-500">Selecione ao menos um filtro</span>
              )}
            </div>
            
            {filteredEntries.length > 0 ? (
              <ScrollArea className="h-40 rounded-md border bg-secondary/20">
                <div className="p-2 space-y-1">
                  {filteredEntries.slice(0, 15).map((entry) => (
                    <div 
                      key={entry.id} 
                      className="flex items-center gap-2 text-sm p-1 rounded hover:bg-secondary/50"
                    >
                      <Checkbox
                        checked={selectedIds.size === 0 || selectedIds.has(entry.id)}
                        onCheckedChange={() => handleToggleEntry(entry.id)}
                      />
                      <img 
                        src={entry.image_url || '/placeholder.svg'} 
                        alt={entry.title}
                        className="w-6 h-8 rounded object-cover"
                      />
                      <span className="truncate flex-1">{entry.title}</span>
                      {entry.rating && (
                        <span className="text-xs text-muted-foreground">★ {entry.rating}</span>
                      )}
                    </div>
                  ))}
                  {filteredEntries.length > 15 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{filteredEntries.length - 15} mais...
                    </p>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-40 rounded-md border bg-secondary/20 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {hasFilters ? 'Nenhum anime encontrado' : 'Selecione filtros para ver o preview'}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="franchise" className="mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                {franchiseGroups.length} franquia{franchiseGroups.length !== 1 && 's'} ({selectedEntries.length} animes)
              </Label>
            </div>
            
            {franchiseGroups.length > 0 ? (
              <ScrollArea className="h-64 rounded-md border bg-secondary/20 p-2">
                <FranchiseListView
                  groups={franchiseGroups}
                  selectedIds={selectedIds}
                  onToggleEntry={handleToggleEntry}
                  onToggleFranchise={handleToggleFranchise}
                  maxVisible={10}
                />
              </ScrollArea>
            ) : (
              <div className="h-40 rounded-md border bg-secondary/20 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {hasFilters ? 'Nenhuma franquia encontrada' : 'Selecione filtros para ver franquias'}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Toggle público/privado */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {isPublic ? (
            <Globe className="h-4 w-4 text-green-500" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="smart-public" className="cursor-pointer text-sm">
            {isPublic ? 'Lista Pública' : 'Lista Privada'}
          </Label>
        </div>
        <Switch
          id="smart-public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end gap-2 pt-2">
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
