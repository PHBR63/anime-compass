import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props do componente SpotlightCard
 * Card com efeito spotlight que segue o cursor
 */
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** Cor do spotlight (padrão: rgba(139, 92, 246, 0.15)) */
  spotlightColor?: string;
  /** Tamanho do spotlight em pixels (padrão: 300) */
  spotlightSize?: number;
  /** Opacidade do spotlight (padrão: 0.15) */
  spotlightOpacity?: number;
  /** Mostrar borda com gradiente (padrão: true) */
  showBorder?: boolean;
  /** Cor da borda gradiente */
  borderColor?: string;
}

/**
 * Componente SpotlightCard
 * Cria um efeito de luz que segue o cursor sobre o card
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor = 'rgba(139, 92, 246, 0.15)',
  spotlightSize = 300,
  spotlightOpacity = 0.15,
  showBorder = true,
  borderColor = 'rgba(139, 92, 246, 0.3)',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Atualiza posição do spotlight baseado no cursor
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // Ativa/desativa hover
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // Estilo do spotlight
  const spotlightStyle: React.CSSProperties = {
    background: `radial-gradient(${spotlightSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent)`,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  // Estilo da borda gradiente
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
      className={cn(
        'relative overflow-hidden rounded-xl',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Camada de borda gradiente */}
      {showBorder && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={borderStyle}
        />
      )}

      {/* Camada do spotlight */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={spotlightStyle}
      />

      {/* Conteúdo do card */}
      <div className="relative z-20">{children}</div>
    </div>
  );
};
