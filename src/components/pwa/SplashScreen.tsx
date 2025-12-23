import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoIcon from '@/assets/logo-icon-light.png';
import logoText from '@/assets/logo-text-light.png';

/**
 * Splash Screen animada para o PWA
 * Exibe logo com animações suaves ao abrir o app
 */
export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Verifica se é a primeira visita da sessão
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    
    if (hasSeenSplash) {
      setIsVisible(false);
      return;
    }

    // Marca como carregado após um pequeno delay
    const loadTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    // Esconde a splash após a animação
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('hasSeenSplash', 'true');
    }, 2800);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Fundo com gradiente animado */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
          
          {/* Círculos decorativos animados */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full border border-primary/10"
            initial={{ scale: 0, opacity: 0 }}
            animate={isLoaded ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full border border-primary/20"
            initial={{ scale: 0, opacity: 0 }}
            animate={isLoaded ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          />
          <motion.div
            className="absolute w-[200px] h-[200px] rounded-full bg-primary/5"
            initial={{ scale: 0, opacity: 0 }}
            animate={isLoaded ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          />

          {/* Pétalas de sakura decorativas */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-sakura/40"
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0, 
                opacity: 0 
              }}
              animate={isLoaded ? { 
                x: Math.cos((i * 60) * Math.PI / 180) * 120,
                y: Math.sin((i * 60) * Math.PI / 180) * 120,
                scale: 1, 
                opacity: [0, 1, 0.6] 
              } : {}}
              transition={{ 
                duration: 1.5, 
                ease: 'easeOut', 
                delay: 0.5 + (i * 0.1) 
              }}
            />
          ))}

          {/* Container da logo */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Ícone da logo com animação de entrada */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={isLoaded ? { scale: 1, rotate: 0 } : {}}
              transition={{ 
                type: 'spring', 
                stiffness: 200, 
                damping: 15,
                delay: 0.2 
              }}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 blur-2xl bg-primary/30 rounded-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isLoaded ? { opacity: [0, 0.6, 0.3], scale: [0.8, 1.2, 1] } : {}}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              
              <img 
                src={logoIcon} 
                alt="AniCheck" 
                className="w-24 h-24 md:w-32 md:h-32 relative z-10 drop-shadow-2xl"
              />
            </motion.div>

            {/* Texto da logo com animação de fade */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isLoaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <img 
                src={logoText} 
                alt="AniCheck" 
                className="h-8 md:h-10 drop-shadow-lg"
              />
            </motion.div>

            {/* Tagline com animação */}
            <motion.p
              className="text-muted-foreground text-sm md:text-base font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={isLoaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              Organize sua jornada anime
            </motion.p>

            {/* Indicador de carregamento */}
            <motion.div
              className="flex gap-1.5 mt-4"
              initial={{ opacity: 0 }}
              animate={isLoaded ? { opacity: 1 } : {}}
              transition={{ delay: 1.2 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Versão do app */}
          <motion.p
            className="absolute bottom-8 text-xs text-muted-foreground/50"
            initial={{ opacity: 0 }}
            animate={isLoaded ? { opacity: 1 } : {}}
            transition={{ delay: 1.5 }}
          >
            v1.0.0
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
