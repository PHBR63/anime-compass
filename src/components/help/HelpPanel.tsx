import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Lightbulb, 
  Play, 
  BookOpen,
  Settings,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useHelp } from '@/contexts/HelpContext';

/**
 * Painel lateral de ajuda
 * Exibe dicas da página atual, opções e configurações de ajuda
 */
export function HelpPanel() {
  const { 
    showHelpPanel, 
    setShowHelpPanel, 
    currentPageHelp,
    startTour,
    helpEnabled,
    setHelpEnabled,
    setShowWelcomeModal
  } = useHelp();

  const hasTour = currentPageHelp?.tourSteps && currentPageHelp.tourSteps.length > 0;

  return (
    <AnimatePresence>
      {showHelpPanel && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelpPanel(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />

          {/* Painel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-primary" />
                <h2 className="font-semibold">Central de Ajuda</h2>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowHelpPanel(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <ScrollArea className="h-[calc(100%-65px)]">
              <div className="p-4 space-y-6">
                {/* Informações da página atual */}
                {currentPageHelp && (
                  <section>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Página Atual
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <h4 className="font-medium">{currentPageHelp.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentPageHelp.description}
                      </p>
                    </div>
                  </section>
                )}

                {/* Dicas da página */}
                {currentPageHelp?.tips && currentPageHelp.tips.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb size={16} className="text-yellow-500" />
                      <h3 className="text-sm font-medium">Dicas</h3>
                    </div>
                    <ul className="space-y-2">
                      {currentPageHelp.tips.map((tip, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span className="text-muted-foreground">{tip}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Ações */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Ações
                  </h3>
                  <div className="space-y-2">
                    {hasTour && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setShowHelpPanel(false);
                          setTimeout(startTour, 300);
                        }}
                      >
                        <Play size={16} />
                        Iniciar Tour Guiado
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        setShowHelpPanel(false);
                        setTimeout(() => setShowWelcomeModal(true), 300);
                      }}
                    >
                      <BookOpen size={16} />
                      Rever Introdução
                    </Button>
                  </div>
                </section>

                <Separator />

                {/* Configurações */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Settings size={16} />
                    <h3 className="text-sm font-medium">Configurações</h3>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Exibir ajuda</p>
                      <p className="text-xs text-muted-foreground">
                        Mostrar tooltips e dicas
                      </p>
                    </div>
                    <Switch 
                      checked={helpEnabled} 
                      onCheckedChange={setHelpEnabled}
                    />
                  </div>
                </section>

                <Separator />

                {/* Links úteis */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Recursos
                  </h3>
                  <div className="space-y-2">
                    <a 
                      href="https://myanimelist.net" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink size={14} />
                      MyAnimeList (fonte de dados)
                    </a>
                  </div>
                </section>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
