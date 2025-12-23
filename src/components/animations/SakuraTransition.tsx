import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Interface para cada pétala de sakura
 */
interface Petal {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  opacity: number;
}

/**
 * Componente individual de pétala de sakura
 */
function SakuraPetal({ petal }: { petal: Petal }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${petal.x}%`,
        top: -20,
        width: petal.size,
        height: petal.size,
      }}
      initial={{ 
        y: -20, 
        opacity: 0, 
        rotate: petal.rotation,
        scale: 0.5,
      }}
      animate={{ 
        y: "105vh", 
        opacity: [0, petal.opacity, petal.opacity * 0.6, 0],
        rotate: petal.rotation + 180,
        x: [0, 15, -10, 20],
        scale: [0.6, 1, 0.9],
      }}
      transition={{
        duration: petal.duration,
        delay: petal.delay,
        ease: "easeOut",
        x: {
          duration: petal.duration,
          ease: "easeInOut",
        },
      }}
    >
      {/* SVG de pétala de sakura */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
      >
        <path
          d="M12 2C12 2 8 6 8 10C8 14 12 18 12 18C12 18 16 14 16 10C16 6 12 2 12 2Z"
          fill="currentColor"
          className="text-sakura"
        />
        <path
          d="M12 18C12 18 8 14 4 14C0 14 0 18 0 18C0 18 4 22 8 22C12 22 12 18 12 18Z"
          fill="currentColor"
          className="text-sakura/80"
        />
        <path
          d="M12 18C12 18 16 14 20 14C24 14 24 18 24 18C24 18 20 22 16 22C12 22 12 18 12 18Z"
          fill="currentColor"
          className="text-sakura/80"
        />
      </svg>
    </motion.div>
  );
}

/**
 * Overlay de transição com pétalas de sakura
 */
function SakuraOverlay({ isVisible }: { isVisible: boolean }) {
  // Gera pétalas com valores aleatórios - versão sutil com menos pétalas
  const petals = useMemo<Petal[]>(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80, // Distribuição mais central
      delay: Math.random() * 0.15, // Delays menores
      duration: 0.8 + Math.random() * 0.4, // Mais rápido (0.8-1.2s)
      size: 10 + Math.random() * 8, // Tamanhos menores (10-18px)
      rotation: Math.random() * 360,
      opacity: 0.5 + Math.random() * 0.3, // Menos opaco
    }));
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Gradiente de fundo sutil */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-sakura/5 via-transparent to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Pétalas caindo */}
          {petals.map((petal) => (
            <SakuraPetal key={petal.id} petal={petal} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SakuraPageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Componente de transição de página com efeito sakura
 * Exibe pétalas caindo durante a transição entre páginas
 */
export function SakuraPageTransition({ children, className = "" }: SakuraPageTransitionProps) {
  const location = useLocation();
  const [showPetals, setShowPetals] = useState(false);
  const [currentChildren, setCurrentChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Inicia a transição
    setIsTransitioning(true);
    setShowPetals(true);

    // Atualiza o conteúdo após um pequeno delay
    const contentTimer = setTimeout(() => {
      setCurrentChildren(children);
      setIsTransitioning(false);
    }, 200);

    // Esconde as pétalas após a animação - mais rápido
    const petalTimer = setTimeout(() => {
      setShowPetals(false);
    }, 800);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(petalTimer);
    };
  }, [location.pathname]);

  // Atualiza children se mudar sem mudar de rota
  useEffect(() => {
    if (!isTransitioning) {
      setCurrentChildren(children);
    }
  }, [children, isTransitioning]);

  return (
    <>
      {/* Overlay com pétalas */}
      <SakuraOverlay isVisible={showPetals} />
      
      {/* Conteúdo da página com animação */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          type: "tween",
          ease: [0.25, 0.1, 0.25, 1],
          duration: 0.25,
        }}
        className={className}
      >
        {currentChildren}
      </motion.div>
    </>
  );
}
