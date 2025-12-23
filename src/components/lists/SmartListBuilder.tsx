import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
} from '@/lib/franchiseDetector';
import { 
  StepModel, 
  StepFilters, 
  StepSelection, 
  StepFinish,
  type SmartListTemplate,
  type FilterState,
} from './smart-list-steps';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type AnimeStatus = Database['public']['Enums']['anime_status'];

// Etapas do wizard
const STEPS = [
  { id: 'model', label: 'Modelo', icon: '1' },
  { id: 'filters', label: 'Filtros', icon: '2' },
  { id: 'selection', label: 'Seleção', icon: '3' },
  { id: 'finish', label: 'Finalizar', icon: '4' },
] as const;

type StepId = typeof STEPS[number]['id'];

interface SmartListBuilderProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Construtor de listas inteligentes com sistema de etapas (wizard)
 * 4 etapas: Modelo → Filtros → Seleção → Finalizar
 */
export function SmartListBuilder({ onSuccess, onCancel }: SmartListBuilderProps) {
  // Estado da etapa atual
  const [currentStep, setCurrentStep] = useState<StepId>('model');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  
  // Estado dos filtros
  const [filters, setFilters] = useState<FilterState>({
    name: '',
    viewMode: 'individual',
    selectedStatuses: [],
    minRating: 0,
    onlyFavorites: false,
    selectedTypes: new Set(['main', 'season', 'movie', 'special']),
    franchiseCriteria: null,
    franchiseSize: null,
  });
  
  // Outros estados
  const [isPublic, setIsPublic] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: entries } = useAnimeEntries();
  const createList = useCreateList();
  const addToList = useAddToList();

  // Filtrar animes baseado nos critérios
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter((entry) => {
      // Filtro por status
      if (filters.selectedStatuses.length > 0 && !filters.selectedStatuses.includes(entry.status)) {
        return false;
      }

      // Filtro por nota mínima
      if (filters.minRating > 0 && (!entry.rating || entry.rating < filters.minRating)) {
        return false;
      }

      // Filtro por favoritos
      if (filters.onlyFavorites && !entry.is_favorite) {
        return false;
      }

      // Não incluir arquivados
      if (entry.is_archived) {
        return false;
      }
      
      // Filtro por tipo de anime
      const type = detectAnimeType(entry.title);
      if (!filters.selectedTypes.has(type)) {
        return false;
      }

      return true;
    }) as AnimeEntry[];
  }, [entries, filters]);

  // Agrupar por franquia
  const franchiseGroups = useMemo(() => {
    let groups = groupByFranchise(filteredEntries);
    
    // Aplicar critério de franquia
    if (filters.franchiseCriteria === 'completed') {
      groups = getCompletedFranchises(groups);
    } else if (filters.franchiseCriteria === 'in_progress') {
      groups = getInProgressFranchises(groups);
    } else if (filters.franchiseCriteria === 'multi_season') {
      groups = getMultiSeasonFranchises(groups);
    } else if (filters.franchiseCriteria === 'high_rated') {
      groups = getHighRatedFranchises(groups, 4);
    } else if (filters.franchiseCriteria === 'nearly_complete') {
      groups = getNearlyCompleteFranchises(groups);
    } else if (filters.franchiseCriteria === 'abandoned') {
      groups = getAbandonedFranchises(groups);
    }
    
    // Aplicar filtro de tamanho
    if (filters.franchiseSize) {
      groups = getFranchisesBySize(groups, filters.franchiseSize);
    }
    
    return groups;
  }, [filteredEntries, filters.franchiseCriteria, filters.franchiseSize]);

  // Entradas finais baseadas no modo
  const finalEntries = useMemo(() => {
    if (filters.viewMode === 'franchise') {
      return franchiseGroups.flatMap(g => g.entries);
    }
    return filteredEntries;
  }, [filters.viewMode, franchiseGroups, filteredEntries]);

  // Entradas selecionadas
  const selectedEntries = useMemo(() => {
    if (selectedIds.size === 0) {
      return finalEntries;
    }
    return finalEntries.filter(e => selectedIds.has(e.id));
  }, [finalEntries, selectedIds]);

  // Verifica se há filtros ativos
  const hasActiveFilters = filters.selectedStatuses.length > 0 || 
    filters.minRating > 0 || 
    filters.onlyFavorites || 
    filters.franchiseCriteria !== null || 
    filters.franchiseSize !== null ||
    filters.selectedTypes.size < 4;

  // Handler para atualizar filtros
  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setSelectedIds(new Set());
    setSelectedTemplateId(undefined);
  }, []);

  // Handler para selecionar template
  const handleSelectTemplate = useCallback((template: SmartListTemplate) => {
    setSelectedTemplateId(template.id);
    
    const newFilters: Partial<FilterState> = {
      name: template.name,
      selectedStatuses: (template.criteria.statuses || []) as AnimeStatus[],
      minRating: template.criteria.minRating || 0,
      onlyFavorites: template.criteria.onlyFavorites || false,
      viewMode: template.criteria.franchiseMode || 'individual',
      franchiseCriteria: template.criteria.franchiseCriteria || null,
      franchiseSize: template.criteria.franchiseSize || null,
      selectedTypes: template.criteria.animeTypes 
        ? new Set(template.criteria.animeTypes)
        : new Set(['main', 'season', 'movie', 'special']),
    };
    
    setFilters(prev => ({ ...prev, ...newFilters }));
    setSelectedIds(new Set());
    
    // Avança para a próxima etapa
    setCurrentStep('filters');
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

  // Handler para selecionar/desmarcar todas
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

  // Handler para criar lista
  const handleCreate = async () => {
    if (!filters.name.trim() || selectedEntries.length === 0) return;

    try {
      const newList = await createList.mutateAsync({
        name: filters.name.trim(),
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

  // Navegação entre etapas
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  
  const goToNextStep = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  }, [currentStepIndex]);

  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  }, [currentStepIndex]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'model':
        return true;
      case 'filters':
        return filters.name.trim().length > 0;
      case 'selection':
        return selectedEntries.length > 0;
      case 'finish':
        return true;
      default:
        return false;
    }
  }, [currentStep, filters.name, selectedEntries.length]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Indicador de progresso - fixo no topo */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 pb-4 flex-shrink-0">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : index < currentStepIndex
                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className={cn(
                "w-5 h-5 flex items-center justify-center rounded-full text-[10px]",
                index < currentStepIndex ? "bg-primary/30" : "bg-background/50"
              )}>
                {index < currentStepIndex ? <Check className="h-3 w-3" /> : step.icon}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            
            {index < STEPS.length - 1 && (
              <div className={cn(
                "w-4 sm:w-8 h-0.5 mx-1",
                index < currentStepIndex ? "bg-primary/50" : "bg-border"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Conteúdo da etapa atual - com scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="pb-4"
          >
            {currentStep === 'model' && (
              <StepModel
                onSelectTemplate={handleSelectTemplate}
                onSkip={() => setCurrentStep('filters')}
                selectedTemplateId={selectedTemplateId}
              />
            )}
            
            {currentStep === 'filters' && (
              <StepFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                totalAnimes={finalEntries.length}
              />
            )}
            
            {currentStep === 'selection' && (
              <StepSelection
                viewMode={filters.viewMode}
                filteredEntries={filteredEntries}
                franchiseGroups={franchiseGroups}
                selectedIds={selectedIds}
                selectedEntries={selectedEntries}
                onToggleEntry={handleToggleEntry}
                onToggleFranchise={handleToggleFranchise}
                onSelectAllFiltered={handleSelectAllFiltered}
                onClearSelection={() => setSelectedIds(new Set())}
                hasActiveFilters={hasActiveFilters}
              />
            )}
            
            {currentStep === 'finish' && (
              <StepFinish
                name={filters.name}
                isPublic={isPublic}
                onPublicChange={setIsPublic}
                selectedEntries={selectedEntries}
                isCreating={createList.isPending}
                onCancel={onCancel}
                onCreate={handleCreate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navegação - fixo no rodapé (exceto na última etapa) */}
      {currentStep !== 'finish' && (
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-border/50 flex-shrink-0 bg-background">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={currentStepIndex === 0 ? onCancel : goToPrevStep}
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStepIndex === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          
          <Button
            size="sm"
            className="gap-1.5"
            onClick={goToNextStep}
            disabled={!canProceed}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Re-exportar templates para compatibilidade
export { SMART_LIST_TEMPLATES, type SmartListTemplate } from './smart-list-steps';
