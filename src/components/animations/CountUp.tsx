import { ReactNode, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * Componente CountUp - Anima números de 0 até o valor final
 * Ideal para estatísticas e métricas
 */

interface CountUpProps {
  end: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  separator?: string;
}

export const CountUp = ({
  end,
  duration = 2,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  separator = '.',
}: CountUpProps) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;

            // Anima o contador
            const obj = { value: 0 };
            gsap.to(obj, {
              value: end,
              duration,
              delay,
              ease: 'power2.out',
              onUpdate: () => {
                setCount(obj.value);
              },
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [end, duration, delay]);

  // Formata o número
  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decimal ? `${formatted},${decimal}` : formatted;
  };

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
};
