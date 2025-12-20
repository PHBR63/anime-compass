import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Indicador de status de sincronização offline
 * Mostra operações pendentes e permite sincronização manual
 */
export function SyncIndicator() {
  const { pendingCount, isSyncing, isOnline, syncAll, lastSyncTime } = useOfflineSync();

  // Não mostra nada se está online e sem pendências
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  // Formata o tempo da última sincronização
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes === 1) return '1 minuto atrás';
    if (minutes < 60) return `${minutes} minutos atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hora atrás';
    return `${hours} horas atrás`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed bottom-20 right-4 z-50 md:bottom-4"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={isOnline && pendingCount > 0 ? syncAll : undefined}
                disabled={!isOnline || pendingCount === 0 || isSyncing}
                className={`
                  rounded-full shadow-lg backdrop-blur-sm
                  ${!isOnline 
                    ? 'bg-warning/20 border-warning/50 text-warning-foreground' 
                    : pendingCount > 0 
                      ? 'bg-primary/20 border-primary/50 text-primary' 
                      : 'bg-success/20 border-success/50 text-success-foreground'
                  }
                `}
              >
                {/* Ícone de status */}
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : !isOnline ? (
                  <CloudOff className="h-4 w-4 mr-2" />
                ) : pendingCount > 0 ? (
                  <Cloud className="h-4 w-4 mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}

                {/* Texto de status */}
                {isSyncing ? (
                  'Sincronizando...'
                ) : !isOnline ? (
                  `Offline (${pendingCount} pendente${pendingCount !== 1 ? 's' : ''})`
                ) : pendingCount > 0 ? (
                  `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`
                ) : (
                  'Sincronizado'
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="text-sm">
                {!isOnline ? (
                  <p>Você está offline. As operações serão sincronizadas quando voltar online.</p>
                ) : pendingCount > 0 ? (
                  <p>Clique para sincronizar agora</p>
                ) : (
                  <p>Última sincronização: {formatLastSync()}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </AnimatePresence>
  );
}
