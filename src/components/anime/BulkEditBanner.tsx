import { Info, MousePointer, CheckSquare, X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkEditBannerProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

/**
 * Banner explicativo para o modo de edição em massa
 * Exibe instruções, atalhos de teclado e botões de ação
 */
export function BulkEditBanner({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
}: BulkEditBannerProps) {
  return (
    <div className="glass-card border-primary/30 bg-primary/5 p-4 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Informações */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Modo de Edição em Massa
              {selectedCount > 0 && (
                <span className="text-sm font-normal text-primary">
                  ({selectedCount} de {totalCount} selecionado{selectedCount !== 1 ? 's' : ''})
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              <MousePointer className="h-3.5 w-3.5 inline mr-1" />
              Clique nos animes para selecioná-los. Use as ações na barra inferior para editar todos de uma vez.
            </p>
          </div>
        </div>

        {/* Atalhos e Ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Atalhos de teclado */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" />
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
                Ctrl+A
              </kbd>
              <span>Selecionar todos</span>
            </div>
            <span className="text-border">•</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
                Esc
              </kbd>
              <span>Cancelar</span>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Selecionar Todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
