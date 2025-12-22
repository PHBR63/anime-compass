import { useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';

/**
 * Componente SplitText - Anima texto letra por letra ou palavra por palavra
 * Inspirado no ReactBits
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
export const SplitText = ({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  ease = 'power3.out',
  splitType = 'chars',
  staggerDelay = 0.03,
  once = true
}: SplitTextProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  // Divide o texto em partes (caracteres ou palavras)
  const parts = useMemo(() => {
    if (splitType === 'words') {
      return text.split(' ').map((word, i, arr) => ({
        content: word,
        isSpace: false,
        key: `word-${i}`,
        addSpace: i < arr.length - 1
      }));
    }
    return text.split('').map((char, i) => ({
      content: char,
      isSpace: char === ' ',
      key: `char-${i}`,
      addSpace: false
    }));
  }, [text, splitType]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const elements = container.querySelectorAll('.split-part');

    // Configuração inicial
    gsap.set(elements, {
      opacity: 0,
      y: 20,
      rotateX: -90
    });

    // Intersection Observer para trigger na viewport
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && (!once || !hasAnimated.current)) {
          hasAnimated.current = true;
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration,
            ease,
            stagger: staggerDelay,
            delay
          });
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [delay, duration, ease, staggerDelay, once]);
  return <span ref={containerRef} className={`inline-flex flex-wrap ${className}`} style={{
    perspective: '1000px'
  }}>
      {parts.map(part => <span key={part.key} className="inline-block">
          <span style={{
        transformStyle: 'preserve-3d',
        whiteSpace: part.isSpace ? 'pre' : 'normal'
      }} className="split-part inline-block text-ring">
            {part.isSpace ? '\u00A0' : part.content}
          </span>
          {part.addSpace && <span>&nbsp;</span>}
        </span>)}
    </span>;
};