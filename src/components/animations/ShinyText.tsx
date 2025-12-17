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
  shimmerWidth = 150,
  speed = 1.5,
  color = 'hsl(183, 100%, 85%)',
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
            hsl(183, 80%, 75%) 0%,
            hsl(183, 90%, 80%) 20%,
            var(--shimmer-color) 50%,
            hsl(183, 90%, 80%) 80%,
            hsl(183, 80%, 75%) 100%
          );
          background-size: calc(100% + var(--shimmer-width)) 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: shiny-text-shimmer var(--shimmer-duration) ease-in-out infinite;
          filter: drop-shadow(0 0 8px hsl(183, 100%, 70%));
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
