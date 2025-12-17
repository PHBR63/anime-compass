import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props do componente MagneticButton
 * Botão com efeito magnético que atrai/repele baseado no cursor
 */
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /** Força do efeito magnético (padrão: 0.3) */
  strength?: number;
  /** Raio de ativação em pixels (padrão: 100) */
  radius?: number;
  /** Duração da transição em ms (padrão: 150) */
  transitionDuration?: number;
  /** Callback de clique */
  onClick?: () => void;
  /** Desabilitar efeito */
  disabled?: boolean;
  /** Tipo do elemento (button ou div) */
  as?: 'button' | 'div';
}

/**
 * Componente MagneticButton
 * Cria um efeito magnético onde o elemento segue suavemente o cursor
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className,
  strength = 0.3,
  radius = 100,
  transitionDuration = 150,
  onClick,
  disabled = false,
  as = 'button',
}) => {
  const ref = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Calcula a posição do efeito magnético baseado no cursor
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

      if (distance < radius) {
        const factor = 1 - distance / radius;
        setPosition({
          x: distanceX * strength * factor,
          y: distanceY * strength * factor,
        });
      }
    },
    [disabled, strength, radius]
  );

  // Reseta posição ao sair
  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  // Ativa estado hover
  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
    }
  }, [disabled]);

  const style: React.CSSProperties = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    transition: `transform ${transitionDuration}ms cubic-bezier(0.33, 1, 0.68, 1)`,
  };

  const Component = as;

  return (
    <Component
      ref={ref as any}
      className={cn(
        'relative inline-flex items-center justify-center',
        isHovered && 'z-10',
        className
      )}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={onClick}
      disabled={as === 'button' ? disabled : undefined}
    >
      {children}
    </Component>
  );
};
