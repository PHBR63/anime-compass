import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check, Wifi } from 'lucide-react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { Button } from '@/components/ui/button';

/**
 * Componente de notificação sutil para atualizações do PWA
 * Aparece brevemente quando uma atualização é detectada ou aplicada
 */
export function UpdateNotification() {
  const { offlineReady, updateApplied, needRefresh, applyUpdate, closeOfflineReady, closeNeedRefresh } = usePWAUpdate();
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Mostrar toast de offline ready
  useEffect(() => {
    if (offlineReady) {
      setShowOfflineToast(true);
      // Auto-fechar após 4 segundos
      const timer = setTimeout(() => {
        setShowOfflineToast(false);
        closeOfflineReady();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady, closeOfflineReady]);

  /**
   * Aplica a atualização quando o usuário clica
   */
  const handleApplyUpdate = async () => {
    setIsApplying(true);
    await applyUpdate(true); // true = reload após aplicar
    setIsApplying(false);
  };

  /**
   * Dispensa a notificação de atualização
   */
  const handleDismiss = () => {
    closeNeedRefresh();
  };

  return (
    <AnimatePresence>
      {/* Toast de nova versão disponível - com ação do usuário */}
      {needRefresh && !updateApplied && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-sakura/20 to-accent/20 backdrop-blur-xl border border-sakura/30 rounded-2xl shadow-lg shadow-sakura/20">
            <div className="w-8 h-8 rounded-full bg-sakura/20 flex items-center justify-center">
              <RefreshCw className={`w-4 h-4 text-sakura ${isApplying ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                Nova versão disponível
              </span>
              <span className="text-xs text-muted-foreground">
                Atualize para obter melhorias
              </span>
            </div>
            <div className="flex gap-2 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 px-3 text-xs"
              >
                Depois
              </Button>
              <Button
                size="sm"
                onClick={handleApplyUpdate}
                disabled={isApplying}
                className="h-8 px-3 text-xs bg-sakura hover:bg-sakura/90 text-white"
              >
                {isApplying ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Toast de atualização aplicada */}
      {updateApplied && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-sakura/20 to-accent/20 backdrop-blur-xl border border-sakura/30 rounded-full shadow-lg shadow-sakura/20">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-6 h-6 rounded-full bg-sakura/20 flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-sakura" />
            </motion.div>
            <span className="text-sm font-medium text-foreground">
              App atualizado!
            </span>
            {/* Pétalas decorativas */}
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-sakura/40 rounded-full blur-sm"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.6, 0.4] 
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Toast de pronto para offline */}
      {showOfflineToast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-torii/20 to-accent/20 backdrop-blur-xl border border-torii/30 rounded-full shadow-lg shadow-torii/20">
            <div className="w-6 h-6 rounded-full bg-torii/20 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-torii" />
            </div>
            <span className="text-sm font-medium text-foreground">
              Pronto para uso offline!
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Indicador de atualização em progresso (loading spinner sutil)
 * Agora mostra apenas quando está aplicando, não quando detecta
 */
export function UpdateLoadingIndicator() {
  // Removido - agora o controle é feito no UpdateNotification
  return null;
}
