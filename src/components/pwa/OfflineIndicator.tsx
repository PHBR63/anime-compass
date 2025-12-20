import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Indicador visual de status de conexão
 * Mostra um banner quando o usuário está offline
 */
export function OfflineIndicator() {
  const { isOffline, justCameOnline } = useOnlineStatus();

  return (
    <AnimatePresence>
      {/* Banner de offline */}
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-warning/90 text-warning-foreground px-4 py-2"
        >
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="h-4 w-4" />
            <span>Você está offline. Algumas funcionalidades podem não estar disponíveis.</span>
          </div>
        </motion.div>
      )}

      {/* Toast de reconexão */}
      {justCameOnline && !isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-success/90 text-success-foreground px-4 py-2"
        >
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <Wifi className="h-4 w-4" />
            <span>Conexão restabelecida!</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
