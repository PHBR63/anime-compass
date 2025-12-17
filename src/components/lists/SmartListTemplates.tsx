import { Trophy, Tv, Film, Clock, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SmartListTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  criteria: {
    statuses?: string[];
    minRating?: number;
    onlyFavorites?: boolean;
    franchiseMode?: 'individual' | 'franchise';
    franchiseCriteria?: 'completed' | 'in_progress' | 'multi_season' | 'high_rated';
    animeTypes?: ('main' | 'season' | 'movie' | 'special')[];
  };
}

/**
 * Templates pré-configurados para listas inteligentes
 */
export const SMART_LIST_TEMPLATES: SmartListTemplate[] = [
  {
    id: 'completed-franchises',
    name: 'Franquias Completas',
    description: 'Séries onde você assistiu todas as temporadas',
    icon: <Trophy className="h-4 w-4 text-yellow-500" />,
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
    criteria: {
      statuses: ['completed'],
      franchiseMode: 'franchise',
      franchiseCriteria: 'multi_season',
    },
  },
  {
    id: 'movie-collection',
    name: 'Coleção de Filmes',
    description: 'Todos os filmes de anime que você já viu',
    icon: <Film className="h-4 w-4 text-purple-500" />,
    criteria: {
      statuses: ['completed'],
      animeTypes: ['movie'],
    },
  },
  {
    id: 'continue-watching',
    name: 'Continuar Assistindo',
    description: 'Franquias que você começou mas não terminou',
    icon: <Clock className="h-4 w-4 text-blue-500" />,
    criteria: {
      franchiseMode: 'franchise',
      franchiseCriteria: 'in_progress',
    },
  },
  {
    id: 'top-rated',
    name: 'Melhores Notas',
    description: 'Franquias com média de nota 4 ou mais',
    icon: <Star className="h-4 w-4 text-yellow-500" />,
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
    criteria: {
      minRating: 5,
      onlyFavorites: true,
    },
  },
];

interface SmartListTemplatesProps {
  onSelectTemplate: (template: SmartListTemplate) => void;
  selectedTemplateId?: string;
}

/**
 * Componente para exibir e selecionar templates de listas inteligentes
 */
export function SmartListTemplates({ onSelectTemplate, selectedTemplateId }: SmartListTemplatesProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Templates Rápidos</p>
      <div className="grid grid-cols-2 gap-2">
        {SMART_LIST_TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant="outline"
            size="sm"
            className={cn(
              "h-auto py-2 px-3 flex flex-col items-start gap-1 text-left",
              selectedTemplateId === template.id && "border-primary bg-primary/10"
            )}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-center gap-2 w-full">
              {template.icon}
              <span className="text-xs font-medium truncate">{template.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground line-clamp-1">
              {template.description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
