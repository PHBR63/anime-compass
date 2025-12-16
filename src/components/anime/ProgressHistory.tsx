import { History, Play, Rewind, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useProgressHistory,
  useClearProgressHistory,
  formatHistoryDate,
  getProgressDescription,
  type ProgressHistoryEntry,
} from '@/hooks/useProgressHistory';
import { cn } from '@/lib/utils';

interface ProgressHistoryProps {
  animeEntryId: string | undefined;
  totalEpisodes: number;
}

// Componente de item individual do histórico
function HistoryItem({ entry, totalEpisodes }: { entry: ProgressHistoryEntry; totalEpisodes: number }) {
  const isIncrease = entry.episodes_to > entry.episodes_from;
  const isComplete = entry.episodes_to === totalEpisodes;

  return (
    <div className="flex items-start gap-3 py-2 px-1">
      {/* Ícone */}
      <div className={cn(
        "mt-0.5 p-1.5 rounded-full",
        isIncrease ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
      )}>
        {isIncrease ? <Play className="h-3 w-3" /> : <Rewind className="h-3 w-3" />}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {getProgressDescription(entry.episodes_from, entry.episodes_to)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatHistoryDate(entry.created_at)}
        </p>
      </div>

      {/* Badge de completo */}
      {isComplete && (
        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
          Completo!
        </Badge>
      )}
    </div>
  );
}

// Componente principal de histórico de progresso
export function ProgressHistory({ animeEntryId, totalEpisodes }: ProgressHistoryProps) {
  const { data: history, isLoading } = useProgressHistory(animeEntryId);
  const clearHistory = useClearProgressHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  if (!animeEntryId) return null;

  const hasHistory = history && history.length > 0;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-9 px-3"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Histórico de Progresso</span>
              {hasHistory && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {history.length}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <div className="glass-card rounded-lg p-3">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-muted" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : hasHistory ? (
              <>
                <ScrollArea className="max-h-[200px]">
                  <div className="divide-y divide-border/50">
                    {history.map((entry) => (
                      <HistoryItem 
                        key={entry.id} 
                        entry={entry} 
                        totalEpisodes={totalEpisodes}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Botão limpar histórico */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setShowClearDialog(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar histórico
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <History className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum histórico ainda
                </p>
                <p className="text-xs text-muted-foreground/70">
                  O progresso será registrado automaticamente
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dialog de confirmação para limpar */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todo o histórico de progresso deste anime será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (animeEntryId) {
                  clearHistory.mutate(animeEntryId);
                }
              }}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
