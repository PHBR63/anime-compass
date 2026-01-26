import { ReactNode, Children, cloneElement, isValidElement, memo } from 'react';
import { motion, Variants, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Componente AnimatedList - Lista com animação de entrada escalonada
 * Migrado de GSAP para Framer Motion (~80KB economia)
 */

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  staggerDelay?: number;
  ease?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  once?: boolean;
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

export const AnimatedList = memo(function AnimatedList({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  staggerDelay = 0.08,
  ease = 'power3.out',
  direction = 'up',
  distance = 20,
  once = true,
}: AnimatedListProps) {
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
      default: return { y: distance, x: 0 };
    }
  };

  const initialPos = getInitialPosition();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      ...initialPos,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        ease: getEase(ease),
      },
    },
  };

  // Envolve cada child em motion.div
  const animatedChildren = Children.map(children, (child, index) => {
    if (isValidElement(child)) {
      return (
        <motion.div
          key={index}
          variants={itemVariants}
          className={`animated-list-item ${child.props.className || ''}`.trim()}
        >
          {cloneElement(child as React.ReactElement<{ className?: string }>, {
            className: undefined, // Remove className do child original
          })}
        </motion.div>
      );
    }
    return child;
  });

  return (
    <motion.div 
      ref={ref} 
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {animatedChildren}
    </motion.div>
  );
});
