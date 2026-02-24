import React, { useRef, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props do componente SpotlightCard
 * Card com efeito spotlight que segue o cursor (desativado em touch devices)
 */
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
  spotlightOpacity?: number;
  showBorder?: boolean;
  borderColor?: string;
}

/**
 * Componente SpotlightCard
 * Cria efeito de luz no cursor. Bypass total em dispositivos touch.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor = 'rgba(139, 92, 246, 0.15)',
  spotlightSize = 300,
  showBorder = true,
  borderColor = 'rgba(139, 92, 246, 0.3)',
}) => {
  // Detecta touch device uma vez
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: none)').matches;
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // Em touch devices, retorna apenas o container sem tracking de mouse
  if (isTouchDevice) {
    return (
      <div className={cn('relative overflow-hidden rounded-xl', className)}>
        <div className="relative z-20">{children}</div>
      </div>
    );
  }

  const spotlightStyle: React.CSSProperties = {
    background: `radial-gradient(${spotlightSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent)`,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  const borderStyle: React.CSSProperties = showBorder
    ? {
        background: `radial-gradient(${spotlightSize * 0.8}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${borderColor}, transparent)`,
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }
    : {};

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden rounded-xl', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showBorder && (
        <div className="absolute inset-0 z-0 pointer-events-none" style={borderStyle} />
      )}
      <div className="absolute inset-0 z-10 pointer-events-none" style={spotlightStyle} />
      <div className="relative z-20">{children}</div>
    </div>
  );
};
