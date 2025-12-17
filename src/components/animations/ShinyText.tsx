import { ReactNode } from 'react';

/**
 * Componente ShinyText - Texto com efeito de brilho animado
 * Ideal para badges, destaques e CTAs
 */

interface ShinyTextProps {
  children: ReactNode;
  className?: string;
  shimmerWidth?: number;
  speed?: number;
  color?: string;
}

export const ShinyText = ({
  children,
  className = '',
  shimmerWidth = 100,
  speed = 2,
  color = 'hsl(183, 100%, 70%)',
}: ShinyTextProps) => {
  const animationDuration = 3 / speed;

  return (
    <span
      className={`shiny-text relative inline-block ${className}`}
      style={{
        '--shimmer-width': `${shimmerWidth}px`,
        '--shimmer-duration': `${animationDuration}s`,
        '--shimmer-color': color,
      } as React.CSSProperties}
    >
      {children}
      
      <style>{`
        .shiny-text {
          background: linear-gradient(
            90deg,
            currentColor 0%,
            currentColor 40%,
            var(--shimmer-color) 50%,
            currentColor 60%,
            currentColor 100%
          );
          background-size: calc(100% + var(--shimmer-width)) 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: shiny-text-shimmer var(--shimmer-duration) ease-in-out infinite;
        }
        
        @keyframes shiny-text-shimmer {
          0% {
            background-position: calc(100% + var(--shimmer-width)) 0;
          }
          100% {
            background-position: calc(-1 * var(--shimmer-width)) 0;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .shiny-text {
            animation: none;
            background: currentColor;
            background-clip: text;
            -webkit-background-clip: text;
          }
        }
      `}</style>
    </span>
  );
};
