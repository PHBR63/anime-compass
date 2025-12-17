import { useState, useEffect, useRef } from 'react';

/**
 * Componente BlurText - Texto que desfoca e foca com animação
 * Ideal para estados de loading ou transições de conteúdo
 */

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  blur?: number;
  animateOnView?: boolean;
}

export const BlurText = ({
  text,
  className = '',
  delay = 0,
  duration = 0.8,
  blur = 10,
  animateOnView = true,
}: BlurTextProps) => {
  const [isVisible, setIsVisible] = useState(!animateOnView);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!animateOnView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay * 1000);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [animateOnView, delay]);

  return (
    <span
      ref={elementRef}
      className={`blur-text inline-block transition-all ${className}`}
      style={{
        '--blur-amount': `${blur}px`,
        '--blur-duration': `${duration}s`,
        filter: isVisible ? 'blur(0)' : `blur(${blur}px)`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transitionDuration: `${duration}s`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      } as React.CSSProperties}
    >
      {text}
    </span>
  );
};
