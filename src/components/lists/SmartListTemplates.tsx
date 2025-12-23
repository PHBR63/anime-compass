import { 
  Trophy, Tv, Film, Clock, Star, Sparkles, 
  Pause, Target, CalendarClock, Ban, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export interface SmartListTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  criteria: {
    statuses?: string[];
    minRating?: number;
    maxRating?: number;
    onlyFavorites?: boolean;
    franchiseMode?: 'individual' | 'franchise';
    franchiseCriteria?: 'completed' | 'in_progress' | 'multi_season' | 'high_rated' | 'nearly_complete' | 'abandoned';
    animeTypes?: ('main' | 'season' | 'movie' | 'special')[];
    /** Filtro por tamanho de franquia */
    franchiseSize?: 'small' | 'medium' | 'large';
  };
  /** Categoria do template para agrupamento */
  category: 'franchise' | 'status' | 'rating' | 'special';
}

/**
 * Templates pré-configurados para listas inteligentes
 * Organizados por categorias para melhor UX
 */
export const SMART_LIST_TEMPLATES: SmartListTemplate[] = [
  // === Categoria: Franquias ===
  {
    id: 'completed-franchises',
    name: 'Franquias Completas',
    description: 'Séries onde você assistiu todas as temporadas',
    icon: <Trophy className="h-4 w-4 text-yellow-500" />,
    category: 'franchise',
    criteria: {
      statuses: ['completed'],
      franchiseMode: 'franchise',
      franchiseCriteria: 'completed',
    },
  },
  {
    id: 'binge-watch',
    name: 'Maratonar',
    description: 'Franquias com múltiplas temporadas para maratona',
    icon: <Tv className="h-4 w-4 text-primary" />,
    category: 'franchise',
    criteria: {
      statuses: ['completed'],
      franchiseMode: 'franchise',
      franchiseCriteria: 'multi_season',
    },
  },
  {
    id: 'continue-watching',
    name: 'Continuar Assistindo',
    description: 'Franquias que você começou mas não terminou',
    icon: <Play className="h-4 w-4 text-blue-500" />,
    category: 'franchise',
    criteria: {
      franchiseMode: 'franchise',
      franchiseCriteria: 'in_progress',
    },
  },
  {
    id: 'nearly-complete',
    name: 'Quase Completas',
    description: 'Franquias com 75%+ de progresso',
    icon: <Target className="h-4 w-4 text-green-500" />,
    category: 'franchise',
    criteria: {
      franchiseMode: 'franchise',
      franchiseCriteria: 'nearly_complete',
    },
  },
  
  // === Categoria: Status ===
  {
    id: 'abandoned',
    name: 'Abandonadas',
    description: 'Animes pausados ou dropados',
    icon: <Ban className="h-4 w-4 text-red-500" />,
    category: 'status',
    criteria: {
      statuses: ['paused', 'dropped'],
    },
  },
  {
    id: 'paused-only',
    name: 'Em Pausa',
    description: 'Animes pausados para retomar',
    icon: <Pause className="h-4 w-4 text-amber-500" />,
    category: 'status',
    criteria: {
      statuses: ['paused'],
    },
  },
  {
    id: 'finish-soon',
    name: 'Terminar Logo',
    description: 'Animes em progresso para finalizar',
    icon: <CalendarClock className="h-4 w-4 text-emerald-500" />,
    category: 'status',
    criteria: {
      statuses: ['watching'],
    },
  },
  
  // === Categoria: Avaliações ===
  {
    id: 'top-rated',
    name: 'Melhores Notas',
    description: 'Franquias com média de nota 4 ou mais',
    icon: <Star className="h-4 w-4 text-yellow-500" />,
    category: 'rating',
    criteria: {
      minRating: 4,
      franchiseMode: 'franchise',
      franchiseCriteria: 'high_rated',
    },
  },
  {
    id: 'favorites-5-stars',
    name: 'Favoritos 5 Estrelas',
    description: 'Seus animes favoritos com nota máxima',
    icon: <Sparkles className="h-4 w-4 text-pink-500" />,
    category: 'rating',
    criteria: {
      minRating: 5,
      onlyFavorites: true,
    },
  },
  
  // === Categoria: Especiais ===
  {
    id: 'movie-collection',
    name: 'Coleção de Filmes',
    description: 'Todos os filmes de anime que você já viu',
    icon: <Film className="h-4 w-4 text-purple-500" />,
    category: 'special',
    criteria: {
      statuses: ['completed'],
      animeTypes: ['movie'],
    },
  },
  {
    id: 'long-series',
    name: 'Séries Longas',
    description: 'Franquias épicas com 50+ episódios',
    icon: <Clock className="h-4 w-4 text-indigo-500" />,
    category: 'special',
    criteria: {
      franchiseMode: 'franchise',
      franchiseSize: 'large',
    },
  },
];

/**
 * Obtém templates por categoria
 */
export function getTemplatesByCategory(category: SmartListTemplate['category']): SmartListTemplate[] {
  return SMART_LIST_TEMPLATES.filter(t => t.category === category);
}

/**
 * Labels para categorias de templates
 */
export const CATEGORY_LABELS: Record<SmartListTemplate['category'], string> = {
  franchise: 'Franquias',
  status: 'Por Status',
  rating: 'Avaliações',
  special: 'Especiais',
};

interface SmartListTemplatesProps {
  onSelectTemplate: (template: SmartListTemplate) => void;
  selectedTemplateId?: string;
  /** Mostra templates em layout compacto */
  compact?: boolean;
}

/**
 * Componente para exibir e selecionar templates de listas inteligentes
 * Com scroll horizontal e categorização
 */
export function SmartListTemplates({ 
  onSelectTemplate, 
  selectedTemplateId,
  compact = false,
}: SmartListTemplatesProps) {
  // Agrupa templates por categoria para exibição
  const categories: SmartListTemplate['category'][] = ['franchise', 'status', 'rating', 'special'];
  
  if (compact) {
    // Versão compacta: scroll horizontal
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Templates Rápidos</p>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {SMART_LIST_TEMPLATES.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-3 gap-1.5 flex-shrink-0",
                  selectedTemplateId === template.id && "border-primary bg-primary/10"
                )}
                onClick={() => onSelectTemplate(template)}
              >
                {template.icon}
                <span className="text-xs">{template.name}</span>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  // Versão completa: grid com categorias
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium">Templates Rápidos</p>
      
      {categories.map((category) => {
        const templates = getTemplatesByCategory(category);
        if (templates.length === 0) return null;
        
        return (
          <div key={category} className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category]}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-auto py-1.5 px-2 flex items-center gap-2 justify-start text-left",
                    selectedTemplateId === template.id && "border-primary bg-primary/10"
                  )}
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="flex-shrink-0">{template.icon}</div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium block truncate">{template.name}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {template.description}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
