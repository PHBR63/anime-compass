import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelp } from '@/contexts/HelpContext';

/**
 * Botão flutuante de ajuda
 * Exibe no canto da tela e abre o painel de ajuda
 */
export function HelpButton() {
  const { setShowHelpPanel, helpEnabled } = useHelp();

  if (!helpEnabled) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      className="fixed bottom-6 right-6 z-30"
    >
      <Button
        onClick={() => setShowHelpPanel(true)}
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Abrir ajuda"
      >
        <HelpCircle size={24} />
      </Button>
    </motion.div>
  );
}
