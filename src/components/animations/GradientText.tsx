import { ReactNode } from 'react';

/**
 * Componente GradientText - Texto com gradiente animado
 * Ideal para títulos e headlines impactantes
 */

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
  animate?: boolean;
}

export const GradientText = ({
  children,
  className = '',
  colors = ['hsl(183, 100%, 50%)', 'hsl(280, 100%, 65%)', 'hsl(199, 89%, 48%)', 'hsl(183, 100%, 50%)'],
  speed = 1,
  animate = true,
}: GradientTextProps) => {
  const animationDuration = 8 / speed;
  const gradientString = colors.join(', ');

  return (
    <span
      className={`gradient-text inline-block ${className}`}
      style={{
        '--gradient-colors': gradientString,
        '--gradient-duration': `${animationDuration}s`,
      } as React.CSSProperties}
    >
      {children}
      
      <style>{`
        .gradient-text {
          background: linear-gradient(
            135deg,
            ${gradientString}
          );
          background-size: ${animate ? '300% 300%' : '100% 100%'};
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          ${animate ? `animation: gradient-text-flow var(--gradient-duration) ease infinite;` : ''}
        }
        
        @keyframes gradient-text-flow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .gradient-text {
            animation: none !important;
            background-size: 100% 100%;
          }
        }
      `}</style>
    </span>
  );
};
