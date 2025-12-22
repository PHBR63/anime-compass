/**
 * WavePattern - Componente de pattern de ondas japonesas (Seigaiha)
 * Padrão tradicional japonês que representa ondas do mar
 * Usado como overlay decorativo sutil
 */

import { memo } from 'react';

interface WavePatternProps {
  /** Cor do pattern (HSL ou hex) */
  color?: string;
  /** Opacidade do pattern */
  opacity?: number;
  /** Tamanho das ondas */
  size?: number;
  /** Classe CSS adicional */
  className?: string;
  /** Se o pattern deve ser animado */
  animated?: boolean;
}

export const WavePattern = memo(({
  color = 'hsl(var(--primary))',
  opacity = 0.05,
  size = 60,
  className = '',
  animated = false,
}: WavePatternProps) => {
  // SVG do pattern Seigaiha (ondas japonesas tradicionais)
  const patternSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size}" viewBox="0 0 ${size * 2} ${size}">
      <defs>
        <pattern id="seigaiha" patternUnits="userSpaceOnUse" width="${size * 2}" height="${size}">
          <g fill="none" stroke="${color}" stroke-width="1" opacity="${opacity}">
            <!-- Primeira fileira de ondas -->
            <circle cx="0" cy="${size}" r="${size * 0.8}"/>
            <circle cx="0" cy="${size}" r="${size * 0.6}"/>
            <circle cx="0" cy="${size}" r="${size * 0.4}"/>
            <circle cx="0" cy="${size}" r="${size * 0.2}"/>
            
            <circle cx="${size}" cy="${size}" r="${size * 0.8}"/>
            <circle cx="${size}" cy="${size}" r="${size * 0.6}"/>
            <circle cx="${size}" cy="${size}" r="${size * 0.4}"/>
            <circle cx="${size}" cy="${size}" r="${size * 0.2}"/>
            
            <circle cx="${size * 2}" cy="${size}" r="${size * 0.8}"/>
            <circle cx="${size * 2}" cy="${size}" r="${size * 0.6}"/>
            <circle cx="${size * 2}" cy="${size}" r="${size * 0.4}"/>
            <circle cx="${size * 2}" cy="${size}" r="${size * 0.2}"/>
            
            <!-- Segunda fileira deslocada -->
            <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.4}"/>
            <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.3}"/>
            <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.2}"/>
            <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.1}"/>
            
            <circle cx="${size * 1.5}" cy="${size * 0.5}" r="${size * 0.4}"/>
            <circle cx="${size * 1.5}" cy="${size * 0.5}" r="${size * 0.3}"/>
            <circle cx="${size * 1.5}" cy="${size * 0.5}" r="${size * 0.2}"/>
            <circle cx="${size * 1.5}" cy="${size * 0.5}" r="${size * 0.1}"/>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#seigaiha)"/>
    </svg>
  `;

  // Converte SVG para data URL
  const encodedSvg = encodeURIComponent(patternSvg);
  const dataUrl = `data:image/svg+xml,${encodedSvg}`;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${animated ? 'animate-wave-drift' : ''} ${className}`}
      style={{
        backgroundImage: `url("${dataUrl}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${size * 2}px ${size}px`,
      }}
    />
  );
});

WavePattern.displayName = 'WavePattern';
