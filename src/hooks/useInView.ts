import { useRef, useState, useEffect, RefObject } from 'react';

/**
 * Hook reutilizável de Intersection Observer
 * Detecta quando um elemento entra na viewport
 */

interface UseInViewOptions {
  /** Threshold de visibilidade (0-1) */
  threshold?: number | number[];
  /** Margem ao redor do root */
  rootMargin?: string;
  /** Elemento root (null = viewport) */
  root?: Element | null;
  /** Disparar apenas uma vez */
  once?: boolean;
  /** Callback quando entra na viewport */
  onEnter?: () => void;
  /** Callback quando sai da viewport */
  onLeave?: () => void;
}

interface UseInViewReturn<T extends HTMLElement> {
  /** Ref para anexar ao elemento */
  ref: RefObject<T>;
  /** Se o elemento está visível */
  isInView: boolean;
}

/**
 * Hook que detecta quando um elemento entra na viewport
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const { ref, isInView } = useInView<HTMLDivElement>({ once: true });
 *   
 *   return (
 *     <div ref={ref} className={isInView ? 'animate-fade-in' : 'opacity-0'}>
 *       Conteúdo animado
 *     </div>
 *   );
 * }
 * ```
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): UseInViewReturn<T> {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    root = null,
    once = false,
    onEnter,
    onLeave,
  } = options;

  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Se já disparou e é once, não criar novo observer
    if (once && hasTriggered.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;

          // Se once=true e já disparou, ignora
          if (once && hasTriggered.current) return;

          if (isVisible) {
            setIsInView(true);
            hasTriggered.current = true;
            onEnter?.();

            // Se once=true, desconecta o observer
            if (once) {
              observer.disconnect();
            }
          } else if (!once) {
            setIsInView(false);
            onLeave?.();
          }
        });
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root, once, onEnter, onLeave]);

  return { ref, isInView };
}

/**
 * Hook para múltiplos elementos (útil para listas)
 */
interface UseInViewMultipleOptions extends Omit<UseInViewOptions, 'onEnter' | 'onLeave'> {
  /** Número de elementos a observar */
  count: number;
}

export function useInViewMultiple<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewMultipleOptions
): { refs: RefObject<T>[]; inViewStates: boolean[] } {
  const { count, threshold = 0.1, rootMargin = '0px', root = null, once = true } = options;

  // Cria refs para todos os elementos
  const refs = useRef<RefObject<T>[]>(
    Array.from({ length: count }, () => ({ current: null }))
  ).current;

  const [inViewStates, setInViewStates] = useState<boolean[]>(
    Array(count).fill(false)
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = refs.findIndex((r) => r.current === entry.target);
          if (index === -1) return;

          if (entry.isIntersecting) {
            setInViewStates((prev) => {
              const next = [...prev];
              next[index] = true;
              return next;
            });
          } else if (!once) {
            setInViewStates((prev) => {
              const next = [...prev];
              next[index] = false;
              return next;
            });
          }
        });
      },
      { threshold, rootMargin, root }
    );

    refs.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [count, threshold, rootMargin, root, once, refs]);

  return { refs, inViewStates };
}
