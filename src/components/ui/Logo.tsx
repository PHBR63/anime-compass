import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

/**
 * Logo SVG vetorial do AniCheck
 * Substitui a imagem PNG de 1.4MB por SVG otimizado (~2KB)
 */
export function Logo({ className, size = 'md', showGlow = true }: LogoProps) {
  // Tamanhos predefinidos para consistência
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Efeito de glow */}
      {showGlow && (
        <div className="absolute inset-0 blur-lg bg-primary/40 rounded-full" />
      )}
      
      {/* Logo SVG */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full h-full"
      >
        {/* Background circle com gradiente */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
          </linearGradient>
          <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary-foreground))" />
            <stop offset="100%" stopColor="hsl(var(--primary-foreground) / 0.9)" />
          </linearGradient>
          {/* Glow filter para efeito neon */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Círculo base */}
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="url(#logoGradient)"
          className="drop-shadow-lg"
        />
        
        {/* Anel decorativo externo */}
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeOpacity="0.3"
        />
        
        {/* Letra A estilizada com check integrado */}
        <g filter="url(#glow)">
          {/* Base do A */}
          <path
            d="M32 14L18 46H24L27 38H37L40 46H46L32 14Z"
            fill="url(#checkGradient)"
          />
          {/* Barra do A */}
          <path
            d="M28.5 33L32 22L35.5 33H28.5Z"
            fill="hsl(var(--primary))"
          />
          {/* Check mark no canto */}
          <path
            d="M42 24L46 28L54 18"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
        
        {/* Pontos decorativos (representando estrelas/anime) */}
        <circle cx="12" cy="20" r="2" fill="hsl(var(--primary-foreground))" opacity="0.6" />
        <circle cx="52" cy="44" r="1.5" fill="hsl(var(--primary-foreground))" opacity="0.4" />
        <circle cx="14" cy="48" r="1" fill="hsl(var(--primary-foreground))" opacity="0.3" />
      </svg>
    </div>
  );
}
