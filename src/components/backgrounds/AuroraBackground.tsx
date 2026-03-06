import { useRef, useMemo, useState, useEffect } from 'react';

/**
 * Componente AuroraBackground - Efeito de aurora boreal animada
 * Versão otimizada com IntersectionObserver para pausar quando fora do viewport
 */

interface AuroraBackgroundProps {
  colorStops?: [string, string, string];
  speed?: number;
  blend?: number;
  className?: string;
}

export const AuroraBackground = ({
  colorStops = ['hsl(183, 100%, 50%)', 'hsl(280, 100%, 65%)', 'hsl(199, 89%, 48%)'],
  speed = 1,
  blend = 0.6,
  className = '',
}: AuroraBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const animationDuration = 15 / speed;

  // Pausa animações quando fora do viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gradientStyle = useMemo(() => ({
    '--aurora-color-1': colorStops[0],
    '--aurora-color-2': colorStops[1],
    '--aurora-color-3': colorStops[2],
    '--aurora-duration': `${animationDuration}s`,
    '--aurora-blend': blend,
    '--aurora-play-state': isVisible ? 'running' : 'paused',
  } as React.CSSProperties), [colorStops, animationDuration, blend, isVisible]);

  return (
    <div 
      ref={containerRef}
      className={`aurora-background absolute inset-0 overflow-hidden ${className}`}
      style={gradientStyle}
    >
      {/* Camadas de gradiente animadas */}
      <div className="aurora-layer aurora-layer-1" />
      <div className="aurora-layer aurora-layer-2" />
      <div className="aurora-layer aurora-layer-3" />
      
      {/* Overlay de ruído para textura */}
      <div className="aurora-noise" />
      
      {/* Estilo inline para manter encapsulado */}
      <style>{`
        .aurora-background {
          pointer-events: none;
          z-index: 0;
        }
        
        .aurora-layer {
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          filter: blur(80px);
          opacity: var(--aurora-blend);
          will-change: transform;
          animation-play-state: var(--aurora-play-state, running);
        }
        
        .aurora-layer-1 {
          background: radial-gradient(ellipse 80% 50% at 20% 40%, var(--aurora-color-1) 0%, transparent 70%);
          animation: aurora-move-1 var(--aurora-duration) ease-in-out infinite;
        }
        
        .aurora-layer-2 {
          background: radial-gradient(ellipse 60% 40% at 70% 60%, var(--aurora-color-2) 0%, transparent 70%);
          animation: aurora-move-2 var(--aurora-duration) ease-in-out infinite;
          animation-delay: calc(var(--aurora-duration) * -0.33);
        }
        
        .aurora-layer-3 {
          background: radial-gradient(ellipse 70% 60% at 50% 30%, var(--aurora-color-3) 0%, transparent 70%);
          animation: aurora-move-3 var(--aurora-duration) ease-in-out infinite;
          animation-delay: calc(var(--aurora-duration) * -0.66);
        }
        
        .aurora-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.03;
          mix-blend-mode: overlay;
        }
        
        @keyframes aurora-move-1 {
          0%, 100% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
          25% { transform: translate(10%, -10%) rotate(5deg) scale(1.1); }
          50% { transform: translate(-5%, 15%) rotate(-5deg) scale(0.95); }
          75% { transform: translate(-10%, 5%) rotate(3deg) scale(1.05); }
        }
        
        @keyframes aurora-move-2 {
          0%, 100% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
          25% { transform: translate(-15%, 10%) rotate(-3deg) scale(1.1); }
          50% { transform: translate(10%, -5%) rotate(5deg) scale(0.9); }
          75% { transform: translate(5%, -15%) rotate(-5deg) scale(1.05); }
        }
        
        @keyframes aurora-move-3 {
          0%, 100% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
          25% { transform: translate(5%, 15%) rotate(3deg) scale(0.95); }
          50% { transform: translate(-10%, -10%) rotate(-3deg) scale(1.1); }
          75% { transform: translate(15%, 5%) rotate(5deg) scale(1); }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .aurora-layer {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
