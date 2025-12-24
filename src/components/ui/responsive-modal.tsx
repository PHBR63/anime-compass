import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * Tamanhos disponíveis para a modal
 */
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

/**
 * Mapeamento de tamanhos para classes Tailwind
 */
const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-4xl',
};

/**
 * Props do componente ResponsiveModal
 */
interface ResponsiveModalProps {
  /** Controla se a modal está aberta */
  open: boolean;
  /** Callback para quando o estado de abertura mudar */
  onOpenChange: (open: boolean) => void;
  /** Título da modal */
  title: string;
  /** Descrição opcional da modal (acessibilidade) */
  description?: string;
  /** Tamanho da modal */
  size?: ModalSize;
  /** Conteúdo do corpo da modal (com scroll automático) */
  children: React.ReactNode;
  /** Conteúdo do footer (fixo na parte inferior) */
  footer?: React.ReactNode;
  /** Classes CSS adicionais para o container */
  className?: string;
  /** Classes CSS adicionais para o conteúdo */
  contentClassName?: string;
  /** Desabilitar o efeito de beams no background */
  showBeams?: boolean;
}

/**
 * Modal responsiva reutilizável com padrões de responsividade e scroll
 * 
 * Características:
 * - Largura responsiva (95vw em mobile)
 * - Altura máxima de 85vh com limite de 700px
 * - Header fixo com título
 * - Área de conteúdo com scroll automático
 * - Footer fixo (opcional)
 * - Suporte a diferentes tamanhos
 * 
 * @example
 * ```tsx
 * <ResponsiveModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Minha Modal"
 *   size="lg"
 *   footer={
 *     <div className="flex gap-2">
 *       <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
 *       <Button onClick={handleSave}>Salvar</Button>
 *     </div>
 *   }
 * >
 *   <p>Conteúdo da modal aqui...</p>
 * </ResponsiveModal>
 * ```
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
  contentClassName,
  showBeams = false,
}: ResponsiveModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showBeams={showBeams}
        className={cn(
          // Largura responsiva - 95% em mobile, max-width conforme size
          'w-[95vw]',
          sizeClasses[size],
          // Altura responsiva
          'h-[85vh] max-h-[700px]',
          // Layout flexível
          'flex flex-col p-0 gap-0',
          className
        )}
      >
        {/* Header fixo */}
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Conteúdo com scroll */}
        <div className={cn(
          'flex-1 overflow-hidden px-4 sm:px-6',
          contentClassName
        )}>
          <ScrollArea className="h-full -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="pb-4">
              {children}
            </div>
          </ScrollArea>
        </div>

        {/* Footer fixo (opcional) */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 sm:p-6 pt-4 border-t flex-shrink-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Componente auxiliar para organizar botões no footer
 */
interface ModalFooterActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooterActions({ children, className }: ModalFooterActionsProps) {
  return (
    <div className={cn('flex items-center justify-end gap-2 w-full', className)}>
      {children}
    </div>
  );
}
