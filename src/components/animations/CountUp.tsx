import { useRef, useEffect, useCallback, memo } from 'react';
import { useInView, animate } from 'framer-motion';

/**
 * Componente CountUp - Anima números de 0 até o valor final
 * Usa manipulação DOM direta (ref.textContent) para evitar re-renders
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

export const CountUp = memo(function CountUp({
  end,
  duration = 2,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  separator = '.',
}: CountUpProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);
  const isInView = useInView(elementRef, { once: true, amount: 0.1 });

  // Formata o número sem causar re-render
  const formatNumber = useCallback((num: number) => {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decimal ? `${formatted},${decimal}` : formatted;
  }, [decimals, separator]);

  useEffect(() => {
    if (!isInView || hasAnimated.current || !elementRef.current) return;

    hasAnimated.current = true;

    // Usa animate do Framer Motion + DOM direto (sem setState = zero re-renders)
    const controls = animate(0, end, {
      duration,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (value) => {
        if (elementRef.current) {
          elementRef.current.textContent = `${prefix}${formatNumber(value)}${suffix}`;
        }
      },
    });

    return () => {
      controls.stop();
    };
  }, [isInView, end, duration, delay, prefix, suffix, formatNumber]);

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formatNumber(0)}{suffix}
    </span>
  );
});
