import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  List, 
  BarChart3, 
  Users, 
  Trophy,
  ChevronRight,
  ChevronLeft,
  X,
  Rocket
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useHelp } from '@/contexts/HelpContext';

const welcomeSteps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao AniCheck! 🎉',
    description: 'Seu companheiro perfeito para acompanhar animes. Vamos fazer um tour rápido pelas principais funcionalidades.',
    color: 'text-primary'
  },
  {
    icon: List,
    title: 'Gerencie sua Lista',
    description: 'Adicione animes, marque episódios assistidos, defina status (assistindo, completo, pausado) e avalie com notas.',
    color: 'text-blue-500'
  },
  {
    icon: BarChart3,
    title: 'Acompanhe seu Progresso',
    description: 'Veja estatísticas detalhadas sobre seus animes, tempo assistido, gêneros favoritos e muito mais no Dashboard.',
    color: 'text-green-500'
  },
  {
    icon: Users,
    title: 'Conecte-se com Amigos',
    description: 'Adicione amigos, compare listas, recomende animes e veja o que todos estão assistindo.',
    color: 'text-purple-500'
  },
  {
    icon: Trophy,
    title: 'Desbloqueie Conquistas',
    description: 'Complete desafios e ganhe conquistas conforme usa o app. Algumas são raras e secretas!',
    color: 'text-yellow-500'
  }
];

/**
 * Modal de boas-vindas para novos usuários
 * Apresenta as principais funcionalidades do app em um carrossel
 */
export function WelcomeModal() {
  const { showWelcomeModal, setShowWelcomeModal, markWelcomeSeen } = useHelp();
  const [currentStep, setCurrentStep] = useState(0);

  // Avança para o próximo passo
  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  // Volta para o passo anterior
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Fecha o modal e marca como visto
  const handleClose = () => {
    setShowWelcomeModal(false);
    markWelcomeSeen();
    setCurrentStep(0);
  };

  const step = welcomeSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === welcomeSteps.length - 1;

  return (
    <Dialog open={showWelcomeModal} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden" showBeams>
        <DialogHeader>
          <DialogTitle className="sr-only">Bem-vindo ao AniCheck</DialogTitle>
        </DialogHeader>
        
        <button 
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center space-y-4"
            >
              {/* Ícone animado */}
              <motion.div 
                className={`mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center ${step.color}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Icon size={32} />
              </motion.div>

              {/* Título */}
              <h3 className="text-xl font-semibold">{step.title}</h3>

              {/* Descrição */}
              <p className="text-muted-foreground text-sm leading-relaxed px-4">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Indicadores de progresso */}
          <div className="flex justify-center gap-1.5 mt-6">
            {welcomeSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-primary' 
                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Ir para passo ${index + 1}`}
              />
            ))}
          </div>

          {/* Botões de navegação */}
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft size={16} />
              Anterior
            </Button>

            <Button
              onClick={handleNext}
              size="sm"
              className="gap-1"
            >
              {isLastStep ? (
                <>
                  Começar <Rocket size={16} />
                </>
              ) : (
                <>
                  Próximo <ChevronRight size={16} />
                </>
              )}
            </Button>
          </div>

          {/* Opção de pular */}
          {!isLastStep && (
            <button
              onClick={handleClose}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              Pular introdução
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
