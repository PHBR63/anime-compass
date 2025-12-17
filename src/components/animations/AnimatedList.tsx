import { useRef, useEffect, ReactNode, Children, cloneElement, isValidElement } from 'react';
import { gsap } from 'gsap';

/**
 * Componente AnimatedList - Lista com animação de entrada escalonada
 * Anima cada item da lista com delay incremental
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

export const AnimatedList = ({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  staggerDelay = 0.08,
  ease = 'power3.out',
  direction = 'up',
  distance = 20,
  once = true,
}: AnimatedListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('.animated-list-item');
    if (items.length === 0) return;

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

    // Configuração inicial
    gsap.set(items, {
      opacity: 0,
      ...initialPos,
    });

    // Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && (!once || !hasAnimated.current)) {
            hasAnimated.current = true;

            gsap.to(items, {
              opacity: 1,
              x: 0,
              y: 0,
              duration,
              ease,
              stagger: staggerDelay,
              delay,
            });
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [delay, duration, staggerDelay, ease, direction, distance, once]);

  // Adiciona classe aos children
  const animatedChildren = Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child as React.ReactElement<{ className?: string }>, {
        className: `${child.props.className || ''} animated-list-item`.trim(),
      });
    }
    return child;
  });

  return (
    <div ref={containerRef} className={className}>
      {animatedChildren}
    </div>
  );
};
