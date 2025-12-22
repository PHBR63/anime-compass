/**
 * JapaneseReveal - Componente de texto com animação de reveal estilo caligrafia japonesa
 * Simula o efeito de pincelada revelando caracteres um a um
 */

import { useEffect, useRef, memo } from 'react';
import { motion, useInView, Variants } from 'framer-motion';

interface JapaneseRevealProps {
  /** Texto a ser revelado */
  text: string;
  /** Delay inicial antes de começar a animação */
  delay?: number;
  /** Duração de cada caractere */
  duration?: number;
  /** Delay entre cada caractere */
  staggerDelay?: number;
  /** Classe CSS adicional */
  className?: string;
  /** Se deve animar quando entrar na viewport */
  animateOnView?: boolean;
  /** Cor do texto (variável CSS) */
  color?: string;
}

export const JapaneseReveal = memo(({
  text,
  delay = 0,
  duration = 0.5,
  staggerDelay = 0.08,
  className = '',
  animateOnView = true,
  color,
}: JapaneseRevealProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.5 });

  // Variantes de animação para o container
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  // Variantes de animação para cada caractere (efeito de pincelada)
  const charVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      scaleY: 0,
      filter: 'blur(8px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scaleY: 1,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1], // easeOutQuint - suave como pincelada
      },
    },
  };

  // Divide o texto em caracteres
  const characters = text.split('');

  return (
    <motion.span
      ref={containerRef}
      className={`inline-block ${className}`}
      style={{ color }}
      variants={containerVariants}
      initial="hidden"
      animate={animateOnView ? (isInView ? 'visible' : 'hidden') : 'visible'}
    >
      {characters.map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className="inline-block origin-bottom"
          variants={charVariants}
          style={{
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
});

JapaneseReveal.displayName = 'JapaneseReveal';
