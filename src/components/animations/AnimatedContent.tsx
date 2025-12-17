import { useRef, useEffect, ReactNode } from 'react';
import { gsap } from 'gsap';

/**
 * Componente AnimatedContent - Anima conteúdo ao entrar na viewport
 * Wrapper que aplica animações de entrada em qualquer children
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

export const AnimatedContent = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 0.6,
  ease = 'power3.out',
  distance = 30,
  once = true,
  scale = 1,
}: AnimatedContentProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

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

    // Configuração inicial
    gsap.set(element, {
      opacity: 0,
      ...initialPos,
      scale: scale < 1 ? scale : 1,
    });

    // Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && (!once || !hasAnimated.current)) {
            hasAnimated.current = true;

            gsap.to(element, {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration,
              ease,
              delay,
            });
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [direction, delay, duration, ease, distance, once, scale]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
};
