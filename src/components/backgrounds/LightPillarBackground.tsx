/**
 * Componente de background com efeito de feixes de luz verticais (Light Pillar)
 * Inspirado no ReactBits - cria um efeito visual elegante e performático
 */

import React from 'react';

interface LightPillarBackgroundProps {
  /** Número de pilares de luz */
  count?: number;
  /** Velocidade da animação (multiplicador) */
  speed?: number;
  /** Intensidade/opacidade dos feixes (0 a 1) */
  intensity?: number;
  /** Classes CSS adicionais */
  className?: string;
}

export const LightPillarBackground: React.FC<LightPillarBackgroundProps> = ({
  count = 6,
  speed = 1,
  intensity = 0.3,
  className = '',
}) => {
  // Gera os pilares com posições e delays variados
  const pillars = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(i / (count - 1)) * 100}%`,
      width: 2 + Math.random() * 3, // Largura entre 2px e 5px
      delay: i * (3 / count) + Math.random() * 2, // Delay escalonado
      duration: 6 + Math.random() * 4, // Duração entre 6s e 10s
      opacity: intensity * (0.5 + Math.random() * 0.5), // Opacidade variada
    }));
  }, [count, intensity]);

  return (
    <div 
      className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      {pillars.map((pillar) => (
        <div
          key={pillar.id}
          className="absolute top-0 animate-light-pillar"
          style={{
            left: pillar.left,
            width: `${pillar.width}px`,
            height: '150%',
            animationDuration: `${pillar.duration / speed}s`,
            animationDelay: `${pillar.delay}s`,
            background: `linear-gradient(
              180deg,
              transparent 0%,
              hsl(var(--primary) / ${pillar.opacity * 0.3}) 20%,
              hsl(var(--primary) / ${pillar.opacity}) 50%,
              hsl(var(--primary) / ${pillar.opacity * 0.3}) 80%,
              transparent 100%
            )`,
            boxShadow: `
              0 0 10px 2px hsl(var(--primary) / ${pillar.opacity * 0.5}),
              0 0 20px 4px hsl(var(--primary) / ${pillar.opacity * 0.3}),
              0 0 40px 8px hsl(var(--primary) / ${pillar.opacity * 0.15})
            `,
            filter: 'blur(1px)',
            transform: 'translateX(-50%)',
          }}
        />
      ))}
    </div>
  );
};
