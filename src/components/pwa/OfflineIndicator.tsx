import { WifiOff, Wifi, X } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useNetworkType } from '@/hooks/useNetworkType';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Indicador visual de status de conexão
 * Usa toast/sonner para notificações não intrusivas
 * Posicionado abaixo de possíveis headers
 */
export function OfflineIndicator() {
  const { isOffline, justCameOnline } = useOnlineStatus();
  const networkInfo = useNetworkType();
  const [showSlowConnection, setShowSlowConnection] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Detectar conexão lenta
  useEffect(() => {
    if (!isOffline && networkInfo.effectiveType) {
      const slowTypes = ['slow-2g', '2g'];
      const isSlow = slowTypes.includes(networkInfo.effectiveType);
      setShowSlowConnection(isSlow);
    } else {
      setShowSlowConnection(false);
    }
  }, [networkInfo.effectiveType, isOffline]);

  // Mostrar toast quando reconectar
  useEffect(() => {
    if (justCameOnline) {
      toast.success('Conexão restabelecida!', {
        description: 'Sincronizando dados...',
        duration: 3000,
        icon: <Wifi className="h-4 w-4" />,
      });
      setDismissed(false);
    }
  }, [justCameOnline]);

  // Resetar dismiss quando mudar status
  useEffect(() => {
    if (isOffline) {
      setDismissed(false);
    }
  }, [isOffline]);

  /**
   * Handler para dispensar o indicador
   */
  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {/* Banner de offline - posicionado abaixo do header com safe-area */}
      {isOffline && !dismissed && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-warning/95 text-warning-foreground backdrop-blur-sm safe-area-top"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-sm font-medium">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">
                Você está offline. Dados serão sincronizados ao reconectar.
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-warning-foreground/10 transition-colors shrink-0"
              aria-label="Dispensar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Indicador de conexão lenta */}
      {showSlowConnection && !isOffline && !dismissed && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 text-white backdrop-blur-sm safe-area-top"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-2 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wifi className="h-4 w-4 shrink-0 opacity-70" />
              <span className="line-clamp-1">
                Conexão lenta detectada. Imagens podem demorar a carregar.
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dispensar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
