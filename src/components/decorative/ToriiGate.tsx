/**
 * ToriiGate - Componente decorativo de portal japonês
 * Usado como separador elegante entre seções
 * Estilo minimalista inspirado em silhuetas tradicionais
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface ToriiGateProps {
  /** Tamanho do componente */
  size?: 'sm' | 'md' | 'lg';
  /** Variante de cor */
  variant?: 'torii' | 'sakura' | 'ink' | 'gradient';
  /** Se deve mostrar decoração adicional (nuvens, etc) */
  withDecoration?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Se deve animar ao aparecer */
  animated?: boolean;
}

const sizeClasses = {
  sm: 'h-12 w-24',
  md: 'h-16 w-32',
  lg: 'h-24 w-48',
};

export const ToriiGate = memo(({
  size = 'md',
  variant = 'torii',
  withDecoration = false,
  className = '',
  animated = true,
}: ToriiGateProps) => {
  // Cores baseadas na variante
  const getColor = () => {
    switch (variant) {
      case 'torii':
        return 'hsl(var(--torii))';
      case 'sakura':
        return 'hsl(var(--sakura))';
      case 'ink':
        return 'hsl(var(--ink))';
      case 'gradient':
        return 'url(#toriiGradient)';
      default:
        return 'hsl(var(--torii))';
    }
  };

  return (
    <div 
      className={cn(
        'flex items-center justify-center gap-4',
        animated && 'animate-fade-in',
        className
      )}
    >
      {/* Linha decorativa esquerda */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* SVG do Torii Gate */}
      <svg
        viewBox="0 0 120 80"
        className={cn(sizeClasses[size], 'flex-shrink-0')}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Definição do gradiente */}
        <defs>
          <linearGradient id="toriiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--torii))" />
            <stop offset="50%" stopColor="hsl(var(--sakura))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
          
          {/* Sombra suave */}
          <filter id="toriiShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>
        
        {/* Nuvens decorativas (opcional) */}
        {withDecoration && (
          <g opacity="0.4">
            {/* Nuvem esquerda */}
            <ellipse cx="15" cy="25" rx="10" ry="5" fill="currentColor" className="text-muted-foreground" />
            <ellipse cx="22" cy="23" rx="8" ry="4" fill="currentColor" className="text-muted-foreground" />
            
            {/* Nuvem direita */}
            <ellipse cx="105" cy="20" rx="10" ry="5" fill="currentColor" className="text-muted-foreground" />
            <ellipse cx="98" cy="18" rx="8" ry="4" fill="currentColor" className="text-muted-foreground" />
          </g>
        )}
        
        {/* Estrutura principal do Torii */}
        <g filter="url(#toriiShadow)">
          {/* Kasagi (trave superior curvada) */}
          <path
            d="M10 20 Q60 10 110 20 L108 25 Q60 16 12 25 Z"
            fill={getColor()}
          />
          
          {/* Shimaki (segunda trave) */}
          <rect
            x="18"
            y="28"
            width="84"
            height="5"
            rx="1"
            fill={getColor()}
          />
          
          {/* Nuki (trave horizontal inferior) */}
          <rect
            x="25"
            y="45"
            width="70"
            height="4"
            rx="1"
            fill={getColor()}
          />
          
          {/* Hashira esquerdo (pilar) */}
          <rect
            x="28"
            y="28"
            width="6"
            height="52"
            rx="1"
            fill={getColor()}
          />
          
          {/* Hashira direito (pilar) */}
          <rect
            x="86"
            y="28"
            width="6"
            height="52"
            rx="1"
            fill={getColor()}
          />
          
          {/* Gakuzuka (placa central) - opcional decorativo */}
          <rect
            x="50"
            y="32"
            width="20"
            height="10"
            rx="2"
            fill={getColor()}
            opacity="0.8"
          />
        </g>
        
        {/* Pétalas de sakura decorativas (opcional) */}
        {withDecoration && (
          <g opacity="0.6">
            <circle cx="40" cy="55" r="2" fill="hsl(var(--sakura))" />
            <circle cx="75" cy="60" r="1.5" fill="hsl(var(--sakura))" />
            <circle cx="55" cy="70" r="2" fill="hsl(var(--sakura))" />
          </g>
        )}
      </svg>
      
      {/* Linha decorativa direita */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
});

ToriiGate.displayName = 'ToriiGate';

/**
 * ToriiDivider - Versão simplificada como divisor de seção
 * Apenas o Torii com linhas horizontais
 */
export const ToriiDivider = memo(({
  className = '',
  variant = 'torii',
}: Pick<ToriiGateProps, 'className' | 'variant'>) => (
  <div className={cn('py-8 md:py-12', className)}>
    <ToriiGate size="md" variant={variant} withDecoration={false} />
  </div>
));

ToriiDivider.displayName = 'ToriiDivider';
