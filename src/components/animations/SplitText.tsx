import { useMemo, memo } from 'react';
import { motion, Variants, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Componente SplitText - Anima texto letra por letra ou palavra por palavra
 * Migrado de GSAP para Framer Motion (~80KB economia)
 */

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words';
  staggerDelay?: number;
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

export const SplitText = memo(function SplitText({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  ease = 'power3.out',
  splitType = 'chars',
  staggerDelay = 0.03,
  once = true,
}: SplitTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { 
    once, 
    margin: '0px 0px -50px 0px',
    amount: 0.1,
  });

  // Divide o texto em partes (caracteres ou palavras)
  const parts = useMemo(() => {
    if (splitType === 'words') {
      return text.split(' ').map((word, i, arr) => ({
        content: word,
        isSpace: false,
        key: `word-${i}`,
        addSpace: i < arr.length - 1,
      }));
    }
    return text.split('').map((char, i) => ({
      content: char,
      isSpace: char === ' ',
      key: `char-${i}`,
      addSpace: false,
    }));
  }, [text, splitType]);

  // Variantes de animação
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const charVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      rotateX: -90,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        duration,
        ease: getEase(ease),
      },
    },
  };

  return (
    <motion.span 
      ref={containerRef} 
      className={`inline-flex flex-wrap ${className}`}
      style={{ perspective: '1000px' }}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {parts.map((part) => (
        <span key={part.key} className="inline-block">
          <motion.span
            style={{
              transformStyle: 'preserve-3d',
              whiteSpace: part.isSpace ? 'pre' : 'normal',
            }}
            className="split-part inline-block text-ring"
            variants={charVariants}
          >
            {part.isSpace ? '\u00A0' : part.content}
          </motion.span>
          {part.addSpace && <span>&nbsp;</span>}
        </span>
      ))}
    </motion.span>
  );
});
