import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncPendingBadgeProps {
  /** Tipo de operação pendente */
  operationType?: string | null;
  /** Tamanho do badge */
  size?: 'sm' | 'md';
  /** Classes adicionais */
  className?: string;
}

/**
 * Badge indicador de sincronização pendente
 * Mostra um ícone de sync animado quando há operações offline
 */
export function SyncPendingBadge({ 
  operationType, 
  size = 'sm',
  className 
}: SyncPendingBadgeProps) {
  // Mapeia tipo de operação para label amigável
  const getOperationLabel = (type: string | null | undefined): string => {
    switch (type) {
      case 'add-anime':
        return 'Adição pendente';
      case 'update-anime':
      case 'update-progress':
        return 'Alteração pendente';
      case 'delete-anime':
        return 'Remoção pendente';
      case 'toggle-favorite':
        return 'Favorito pendente';
      default:
        return 'Sincronização pendente';
    }
  };

  const sizeClasses = {
    sm: 'h-5 w-5 p-0.5',
    md: 'h-6 w-6 p-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center justify-center rounded-full",
              "bg-warning/90 backdrop-blur-sm shadow-lg",
              "animate-pulse",
              sizeClasses[size],
              className
            )}
          >
            <RefreshCw 
              className={cn(
                "text-warning-foreground animate-spin",
                iconSizes[size]
              )} 
              style={{ animationDuration: '2s' }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="bg-popover border border-border text-popover-foreground"
        >
          <p className="text-xs font-medium">
            {getOperationLabel(operationType)}
          </p>
          <p className="text-xs text-muted-foreground">
            Será sincronizado quando voltar online
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
