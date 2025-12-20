import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Banner de instalação do PWA
 * Mostra instruções diferentes para iOS e Android/Desktop
 */
export function InstallBanner() {
  const { 
    shouldShowBanner, 
    canInstall, 
    deviceType, 
    install, 
    dismissBanner 
  } = usePWAInstall();

  // Função para instalar o app
  const handleInstall = async () => {
    const success = await install();
    if (success) {
      dismissBanner();
    }
  };

  return (
    <AnimatePresence>
      {shouldShowBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="max-w-lg mx-auto glass-card p-4 border border-border shadow-xl">
            {/* Botão de fechar */}
            <button
              onClick={dismissBanner}
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Fechar banner"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-4">
              {/* Ícone do app */}
              <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-primary-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm md:text-base">
                  Instale o AniCheck
                </h3>
                
                {deviceType === 'ios' ? (
                  // Instruções para iOS
                  <div className="mt-2 space-y-2">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Para instalar, toque em{' '}
                      <Share className="inline h-4 w-4 text-primary" />{' '}
                      e depois em{' '}
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Plus className="h-4 w-4" />
                        Adicionar à Tela
                      </span>
                    </p>
                  </div>
                ) : (
                  // Instruções para Android/Desktop
                  <div className="mt-2 space-y-3">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Tenha acesso rápido ao AniCheck direto da sua tela inicial
                    </p>
                    
                    {canInstall && (
                      <Button 
                        onClick={handleInstall}
                        size="sm"
                        className="w-full md:w-auto gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Instalar Agora
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
