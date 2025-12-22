/**
 * NeonText - Componente de texto com efeito neon estilo anime/cyberpunk
 * Cria um glow animado que pulsa como letreiros de Tokyo à noite
 */

import { memo, ReactNode } from 'react';

interface NeonTextProps {
  /** Conteúdo do texto */
  children: ReactNode;
  /** Cor do neon (nome da variável CSS ou valor direto) */
  color?: 'primary' | 'accent' | 'sakura' | 'torii' | string;
  /** Intensidade do glow */
  intensity?: 'low' | 'medium' | 'high';
  /** Se deve ter animação de pulso */
  animated?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Tag HTML a ser usada */
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
  /** Se deve ter efeito de flicker (piscar) */
  flicker?: boolean;
}

export const NeonText = memo(({
  children,
  color = 'primary',
  intensity = 'medium',
  animated = true,
  className = '',
  as: Component = 'span',
  flicker = false,
}: NeonTextProps) => {
  // Mapeia cores para valores CSS
  const colorMap: Record<string, string> = {
    primary: 'hsl(var(--primary))',
    accent: 'hsl(var(--accent))',
    sakura: 'hsl(var(--sakura))',
    torii: 'hsl(var(--torii))',
  };

  const colorValue = colorMap[color] || color;

  // Configurações de intensidade do glow
  const intensityConfig = {
    low: {
      textShadow: `0 0 5px ${colorValue}, 0 0 10px ${colorValue}`,
      animatedShadow: `0 0 10px ${colorValue}, 0 0 20px ${colorValue}, 0 0 30px ${colorValue}`,
    },
    medium: {
      textShadow: `0 0 10px ${colorValue}, 0 0 20px ${colorValue}, 0 0 30px ${colorValue}`,
      animatedShadow: `0 0 20px ${colorValue}, 0 0 40px ${colorValue}, 0 0 60px ${colorValue}`,
    },
    high: {
      textShadow: `0 0 15px ${colorValue}, 0 0 30px ${colorValue}, 0 0 45px ${colorValue}, 0 0 60px ${colorValue}`,
      animatedShadow: `0 0 30px ${colorValue}, 0 0 60px ${colorValue}, 0 0 90px ${colorValue}, 0 0 120px ${colorValue}`,
    },
  };

  const config = intensityConfig[intensity];

  return (
    <Component
      className={`
        ${animated ? 'animate-neon-pulse' : ''}
        ${flicker ? 'animate-neon-flicker' : ''}
        ${className}
      `}
      style={{
        color: colorValue,
        textShadow: config.textShadow,
        '--neon-glow': config.textShadow,
        '--neon-glow-intense': config.animatedShadow,
      } as React.CSSProperties}
    >
      {children}
    </Component>
  );
});

NeonText.displayName = 'NeonText';
