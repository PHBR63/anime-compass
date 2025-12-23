import { useMemo } from 'react';
import { 
  Trophy, Tv, Film, Clock, Star, Sparkles, 
  Pause, Target, CalendarClock, Ban, Play, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    franchiseSize?: 'small' | 'medium' | 'large';
  };
  category: 'franchise' | 'status' | 'rating' | 'special';
}

/**
 * Templates pré-configurados para listas inteligentes
 */
export const SMART_LIST_TEMPLATES: SmartListTemplate[] = [
  {
    id: 'completed-franchises',
    name: 'Franquias Completas',
    description: 'Séries onde você assistiu todas as temporadas',
    icon: <Trophy className="h-5 w-5 text-yellow-500" />,
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
    icon: <Tv className="h-5 w-5 text-primary" />,
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
    icon: <Play className="h-5 w-5 text-blue-500" />,
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
    icon: <Target className="h-5 w-5 text-green-500" />,
    category: 'franchise',
    criteria: {
      franchiseMode: 'franchise',
      franchiseCriteria: 'nearly_complete',
    },
  },
  {
    id: 'abandoned',
    name: 'Abandonadas',
    description: 'Animes pausados ou dropados',
    icon: <Ban className="h-5 w-5 text-red-500" />,
    category: 'status',
    criteria: {
      statuses: ['paused', 'dropped'],
    },
  },
  {
    id: 'paused-only',
    name: 'Em Pausa',
    description: 'Animes pausados para retomar',
    icon: <Pause className="h-5 w-5 text-amber-500" />,
    category: 'status',
    criteria: {
      statuses: ['paused'],
    },
  },
  {
    id: 'finish-soon',
    name: 'Terminar Logo',
    description: 'Animes em progresso para finalizar',
    icon: <CalendarClock className="h-5 w-5 text-emerald-500" />,
    category: 'status',
    criteria: {
      statuses: ['watching'],
    },
  },
  {
    id: 'top-rated',
    name: 'Melhores Notas',
    description: 'Franquias com média de nota 4 ou mais',
    icon: <Star className="h-5 w-5 text-yellow-500" />,
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
    icon: <Sparkles className="h-5 w-5 text-pink-500" />,
    category: 'rating',
    criteria: {
      minRating: 5,
      onlyFavorites: true,
    },
  },
  {
    id: 'movie-collection',
    name: 'Coleção de Filmes',
    description: 'Todos os filmes de anime que você já viu',
    icon: <Film className="h-5 w-5 text-purple-500" />,
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
    icon: <Clock className="h-5 w-5 text-indigo-500" />,
    category: 'special',
    criteria: {
      franchiseMode: 'franchise',
      franchiseSize: 'large',
    },
  },
];

const CATEGORY_LABELS: Record<SmartListTemplate['category'], string> = {
  franchise: '📦 Franquias',
  status: '📊 Por Status',
  rating: '⭐ Avaliações',
  special: '✨ Especiais',
};

interface StepModelProps {
  onSelectTemplate: (template: SmartListTemplate) => void;
  onSkip: () => void;
  selectedTemplateId?: string;
}

/**
 * Etapa 1: Seleção de modelo/template
 * Cards maiores e mais espaçosos para fácil seleção
 */
export function StepModel({ onSelectTemplate, onSkip, selectedTemplateId }: StepModelProps) {
  // Agrupa templates por categoria
  const groupedTemplates = useMemo(() => {
    const groups: Record<SmartListTemplate['category'], SmartListTemplate[]> = {
      franchise: [],
      status: [],
      rating: [],
      special: [],
    };
    
    SMART_LIST_TEMPLATES.forEach(t => {
      groups[t.category].push(t);
    });
    
    return groups;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="font-medium">Escolha um modelo para começar</h3>
        <p className="text-sm text-muted-foreground">
          Selecione um template ou crie do zero
        </p>
      </div>

      {/* Botão criar do zero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          variant="outline"
          className="w-full h-14 gap-3 text-left justify-start border-dashed hover:border-primary hover:bg-primary/5"
          onClick={onSkip}
        >
          <Zap className="h-5 w-5 text-primary" />
          <div>
            <span className="font-medium block">Criar do Zero</span>
            <span className="text-xs text-muted-foreground">Configure manualmente os filtros</span>
          </div>
        </Button>
      </motion.div>

      {/* Grid de templates por categoria */}
      <div className="space-y-4">
        {(Object.keys(groupedTemplates) as SmartListTemplate['category'][]).map((category, categoryIndex) => (
          <motion.div 
            key={category} 
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: categoryIndex * 0.05 }}
          >
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groupedTemplates[category].map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                >
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-auto py-3 px-3 flex items-start gap-3 text-left justify-start transition-all",
                      selectedTemplateId === template.id 
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30" 
                        : "hover:border-primary/50 hover:bg-secondary/50"
                    )}
                    onClick={() => onSelectTemplate(template)}
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-secondary/50">
                      {template.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium block text-sm">{template.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </span>
                    </div>
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
