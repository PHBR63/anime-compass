import { cn } from '@/lib/utils';

// Importa as imagens do logo
import logoIcon from '@/assets/logo-icon.png';
import logoText from '@/assets/logo-text.png';
import logoFull from '@/assets/logo-full.png';

interface LogoProps {
  className?: string;
  /**
   * Variante do logo:
   * - icon: Apenas o ícone Torii com check
   * - text: Apenas o texto "AniCheck"
   * - full: Logo completo com ícone e texto
   */
  variant?: 'icon' | 'text' | 'full';
  /**
   * Tamanho do logo
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /**
   * Exibir efeito de glow ao redor do logo
   */
  showGlow?: boolean;
}

/**
 * Componente Logo do AniCheck
 * Usa as imagens PNG coloridas do projeto
 */
export function Logo({ 
  className, 
  variant = 'icon', 
  size = 'md', 
  showGlow = false 
}: LogoProps) {
  // Tamanhos predefinidos para o ícone
  const iconSizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto',
    '2xl': 'h-20 w-auto',
  };

  // Tamanhos predefinidos para o texto
  const textSizeClasses = {
    sm: 'h-4 w-auto',
    md: 'h-5 w-auto',
    lg: 'h-7 w-auto',
    xl: 'h-9 w-auto',
    '2xl': 'h-12 w-auto',
  };

  // Tamanhos predefinidos para logo completo
  const fullSizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-14 w-auto',
    xl: 'h-20 w-auto',
    '2xl': 'h-28 w-auto',
  };

  // Seleciona a imagem e classe baseado na variante
  const getImageConfig = () => {
    switch (variant) {
      case 'text':
        return { src: logoText, sizeClass: textSizeClasses[size], alt: 'AniCheck' };
      case 'full':
        return { src: logoFull, sizeClass: fullSizeClasses[size], alt: 'AniCheck Logo' };
      case 'icon':
      default:
        return { src: logoIcon, sizeClass: iconSizeClasses[size], alt: 'AniCheck Icon' };
    }
  };

  const { src, sizeClass, alt } = getImageConfig();

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {/* Efeito de glow */}
      {showGlow && (
        <div 
          className="absolute inset-0 blur-lg bg-primary/40 rounded-full scale-110"
          aria-hidden="true" 
        />
      )}
      
      {/* Imagem do logo */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'relative object-contain',
          sizeClass
        )}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
