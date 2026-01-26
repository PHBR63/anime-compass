import { ReactNode, memo } from 'react';
import { motion, Variants, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Componente AnimatedContent - Anima conteúdo ao entrar na viewport
 * Migrado de GSAP para Framer Motion (~80KB economia)
 */

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  duration?: number;
  ease?: string;
  distance?: number;
  once?: boolean;
  scale?: number;
}

// Converte ease GSAP para Framer Motion (cubic-bezier)
const getEase = (gsapEase: string): [number, number, number, number] => {
  const easeMap: Record<string, [number, number, number, number]> = {
    'power3.out': [0.22, 1, 0.36, 1],
    'power2.out': [0.25, 0.46, 0.45, 0.94],
    'power4.out': [0.16, 1, 0.3, 1],
    'expo.out': [0.19, 1, 0.22, 1],
  };
  return easeMap[gsapEase] || [0.22, 1, 0.36, 1];
};

export const AnimatedContent = memo(function AnimatedContent({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 0.6,
  ease = 'power3.out',
  distance = 30,
  once = true,
  scale = 1,
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { 
    once, 
    margin: '0px 0px -30px 0px',
    amount: 0.1,
  });

  // Calcula posição inicial baseada na direção
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance, x: 0 };
      case 'down': return { y: -distance, x: 0 };
      case 'left': return { x: distance, y: 0 };
      case 'right': return { x: -distance, y: 0 };
      case 'none': return { x: 0, y: 0 };
      default: return { y: distance, x: 0 };
    }
  };

  const initialPos = getInitialPosition();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...initialPos,
      scale: scale < 1 ? scale : 1,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration,
        ease: getEase(ease),
        delay,
      },
    },
  };

  return (
    <motion.div 
      ref={ref} 
      className={className}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
});
