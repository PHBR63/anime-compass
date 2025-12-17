import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHelp } from '@/contexts/HelpContext';

interface HelpTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconSize?: number;
}

/**
 * Componente de tooltip de ajuda
 * Exibe um ícone de interrogação que mostra uma dica ao passar o mouse
 */
export function HelpTooltip({ 
  content, 
  side = 'top', 
  className = '',
  iconSize = 14 
}: HelpTooltipProps) {
  const { helpEnabled } = useHelp();

  // Não renderiza se a ajuda estiver desabilitada
  if (!helpEnabled) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button 
            className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
            type="button"
            aria-label="Ajuda"
          >
            <HelpCircle size={iconSize} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
