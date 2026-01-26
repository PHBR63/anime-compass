import { useRef, useState, useEffect, memo } from 'react';
import { useInView, animate } from 'framer-motion';

/**
 * Componente CountUp - Anima números de 0 até o valor final
 * Migrado de GSAP para Framer Motion (~80KB economia)
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
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);
  const isInView = useInView(elementRef, { once: true, amount: 0.1 });

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;

    hasAnimated.current = true;

    // Usa animate do Framer Motion para interpolar o valor
    const controls = animate(0, end, {
      duration,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94], // power2.out
      onUpdate: (value) => {
        setCount(value);
      },
    });

    return () => {
      controls.stop();
    };
  }, [isInView, end, duration, delay]);

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
});
