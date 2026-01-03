/**
 * Badge indicador de fonte dos dados do anime
 * Mostra de onde os dados foram obtidos (catálogo, Jikan, ou apenas dados locais)
 */

import { Database, Cloud, HardDrive, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type DataSource = 'catalog' | 'jikan' | 'local' | 'cache' | null;

interface DataSourceBadgeProps {
  source: DataSource;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

// Configurações visuais para cada fonte
const sourceConfig: Record<NonNullable<Exclude<DataSource, null>>, {
  icon: typeof Database;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  catalog: {
    icon: Database,
    label: 'Catálogo',
    description: 'Dados completos do catálogo (sinopse em PT-BR disponível)',
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
  },
  jikan: {
    icon: Cloud,
    label: 'Jikan',
    description: 'Dados do MyAnimeList via Jikan API (sinopse em inglês)',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
  },
  local: {
    icon: HardDrive,
    label: 'Local',
    description: 'Apenas dados básicos salvos localmente',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/20',
  },
  cache: {
    icon: HardDrive,
    label: 'Cache',
    description: 'Dados obtidos do cache local (offline)',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
  },
};

/**
 * Componente badge que indica a fonte dos dados do anime
 */
export function DataSourceBadge({ 
  source, 
  className,
  showLabel = false,
  size = 'sm'
}: DataSourceBadgeProps) {
  // Se não tem fonte ou é catálogo/cache (completo), não mostra nada
  if (!source || source === 'catalog' || source === 'cache') {
    return null;
  }

  const config = sourceConfig[source];
  const Icon = config.icon;
  
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const padding = size === 'sm' ? 'p-1' : 'p-1.5';
  const fontSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'inline-flex items-center gap-1 rounded-full backdrop-blur-sm border border-border/50',
              padding,
              config.bgColor,
              className
            )}
          >
            <Icon className={cn(iconSize, config.color)} />
            {showLabel && (
              <span className={cn(fontSize, 'font-medium', config.color)}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Badge de aviso quando dados limitados estão disponíveis
 */
export function LimitedDataBadge({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'inline-flex items-center gap-1 p-1 rounded-full backdrop-blur-sm',
              'bg-amber-500/20 border border-amber-500/30',
              className
            )}
          >
            <AlertCircle className="h-3 w-3 text-amber-500" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            Dados limitados - Este anime não está no catálogo principal
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
