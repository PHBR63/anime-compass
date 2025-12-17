import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelp } from '@/contexts/HelpContext';

/**
 * Overlay do tour guiado
 * Destaca elementos na página e exibe informações sobre cada um
 */
export function TourOverlay() {
  const { 
    isTourActive, 
    currentTourStep, 
    currentPageHelp,
    nextStep,
    prevStep,
    endTour
  } = useHelp();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = currentPageHelp?.tourSteps[currentTourStep];
  const totalSteps = currentPageHelp?.tourSteps.length || 0;

  // Encontra e posiciona o elemento alvo
  useEffect(() => {
    if (!isTourActive || !step) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Calcula posição do tooltip
        const tooltipWidth = 280;
        const tooltipHeight = 150;
        const padding = 16;
        
        let x = rect.left + rect.width / 2 - tooltipWidth / 2;
        let y = rect.bottom + padding;

        // Ajusta se sair da tela
        if (x < padding) x = padding;
        if (x + tooltipWidth > window.innerWidth - padding) {
          x = window.innerWidth - tooltipWidth - padding;
        }
        
        if (y + tooltipHeight > window.innerHeight - padding) {
          y = rect.top - tooltipHeight - padding;
        }

        setTooltipPosition({ x, y });

        // Scroll para o elemento se necessário
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    findTarget();
    
    // Re-calcula no resize
    window.addEventListener('resize', findTarget);
    return () => window.removeEventListener('resize', findTarget);
  }, [isTourActive, step, currentTourStep]);

  if (!isTourActive || !step) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {/* Overlay escuro com buraco para o elemento */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="100%" 
            fill="rgba(0,0,0,0.75)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Borda destacando o elemento */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-2 border-primary rounded-lg pointer-events-none"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 0 4px rgba(var(--primary), 0.2)'
            }}
          />
        )}

        {/* Tooltip com informações */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bg-card border border-border rounded-lg shadow-xl p-4 w-72"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          {/* Botão fechar */}
          <button
            onClick={endTour}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar tour"
          >
            <X size={16} />
          </button>

          {/* Conteúdo */}
          <div className="pr-6">
            <h4 className="font-semibold text-sm">{step.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {step.content}
            </p>
          </div>

          {/* Navegação */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {currentTourStep + 1} de {totalSteps}
            </span>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                disabled={currentTourStep === 0}
                className="h-8 px-2"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <Button
                size="sm"
                onClick={nextStep}
                className="h-8"
              >
                {currentTourStep === totalSteps - 1 ? 'Finalizar' : 'Próximo'}
                {currentTourStep < totalSteps - 1 && <ChevronRight size={16} className="ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
