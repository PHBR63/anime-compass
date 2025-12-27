/**
 * InkCursor - Componente de cursor com efeito de tinta sumi-e
 * Cria um rastro de tinta que segue o mouse, estilo caligrafia japonesa
 * Baseado no conceito SplashCursor do ReactBits
 */

import { useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { useIsAnimationEnabled } from '@/hooks/useAnimationPreferences';

/**
 * Resolve uma cor CSS que pode conter variáveis para um valor RGB/HSL válido
 */
function resolveColorVariable(color: string): string {
  // Se não contém variável CSS, retorna como está
  if (!color.includes('var(')) return color;
  
  try {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    
    // Extrai o nome da variável CSS
    const varMatch = color.match(/var\(--([^)]+)\)/);
    if (!varMatch) return color;
    
    const cssValue = style.getPropertyValue(`--${varMatch[1]}`).trim();
    if (!cssValue) return '#333333'; // Fallback seguro
    
    // Se já é um formato de cor válido (hex, rgb, hsl com parênteses)
    if (cssValue.startsWith('#') || cssValue.startsWith('rgb') || cssValue.startsWith('hsl(')) {
      return cssValue;
    }
    
    // Formato "220 20% 15%" do Tailwind → "hsl(220, 20%, 15%)"
    const parts = cssValue.split(/\s+/);
    if (parts.length === 3) {
      return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }
    
    return cssValue;
  } catch {
    return '#333333'; // Fallback em caso de erro
  }
}

interface InkDrop {
  x: number;
  y: number;
  size: number;
  opacity: number;
  createdAt: number;
  vx: number;
  vy: number;
}

interface InkCursorProps {
  /** Cor da tinta (HSL ou hex) */
  color?: string;
  /** Tamanho base das gotas */
  size?: number;
  /** Número máximo de gotas */
  maxDrops?: number;
  /** Tempo de vida das gotas (ms) */
  lifetime?: number;
  /** Se deve criar rastro contínuo ou apenas em movimento */
  continuous?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

export const InkCursor = memo(({
  color = 'hsl(var(--ink))',
  size = 12,
  maxDrops = 50,
  lifetime = 2000,
  continuous = true,
  className = '',
}: InkCursorProps) => {
  // Verifica se o efeito de cursor está habilitado nas preferências
  const isEnabled = useIsAnimationEnabled('cursorEffects');
  
  // Resolve a cor CSS para um valor válido para Canvas
  const resolvedColor = useMemo(() => resolveColorVariable(color), [color]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<InkDrop[]>([]);
  const animationRef = useRef<number>();
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);

  // Desenha uma gota de tinta com efeito de dispersão
  const drawInkDrop = useCallback((ctx: CanvasRenderingContext2D, drop: InkDrop) => {
    const age = Date.now() - drop.createdAt;
    const lifeProgress = age / lifetime;
    
    // Fade out gradual
    const currentOpacity = drop.opacity * (1 - lifeProgress);
    
    // Expansão suave
    const currentSize = drop.size * (1 + lifeProgress * 0.5);
    
    ctx.save();
    ctx.globalAlpha = currentOpacity;
    
    // Cria gradiente radial para efeito de tinta (usa cor resolvida)
    const gradient = ctx.createRadialGradient(
      drop.x, drop.y, 0,
      drop.x, drop.y, currentSize
    );
    gradient.addColorStop(0, resolvedColor);
    gradient.addColorStop(0.5, resolvedColor);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Adiciona textura de tinta (pontos menores ao redor)
    if (currentOpacity > 0.3) {
      ctx.globalAlpha = currentOpacity * 0.3;
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = currentSize * (0.5 + Math.random() * 0.5);
        const px = drop.x + Math.cos(angle) * distance;
        const py = drop.y + Math.sin(angle) * distance;
        const psize = currentSize * 0.2;
        
        ctx.beginPath();
        ctx.arc(px, py, psize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }, [resolvedColor, lifetime]);

  // Handler de movimento do mouse
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isEnabled) return;
    
    const now = Date.now();
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff = now - lastTimeRef.current;
    
    // Só cria gotas se houve movimento significativo ou modo contínuo
    if (distance > 5 || (continuous && timeDiff > 50)) {
      // Velocidade influencia tamanho
      const speed = distance / (timeDiff || 1);
      const dropSize = size * (0.5 + Math.min(speed * 0.1, 1.5));
      
      const newDrop: InkDrop = {
        x: e.clientX,
        y: e.clientY,
        size: dropSize + Math.random() * size * 0.5,
        opacity: 0.3 + Math.random() * 0.4,
        createdAt: now,
        vx: dx * 0.1,
        vy: dy * 0.1,
      };
      
      dropsRef.current.push(newDrop);
      
      // Limita número de gotas
      if (dropsRef.current.length > maxDrops) {
        dropsRef.current.shift();
      }
      
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = now;
    }
  }, [isEnabled, size, maxDrops, continuous]);

  useEffect(() => {
    if (!isEnabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajusta tamanho do canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    // Loop de animação
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      // Remove gotas antigas e desenha as restantes
      dropsRef.current = dropsRef.current.filter((drop) => {
        const age = now - drop.createdAt;
        if (age > lifetime) return false;
        
        // Aplica movimento residual
        drop.x += drop.vx;
        drop.y += drop.vy;
        drop.vx *= 0.95;
        drop.vy *= 0.95;
        
        drawInkDrop(ctx, drop);
        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isEnabled, handleMouseMove, drawInkDrop, lifetime]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-50 ${className}`}
      style={{ 
        mixBlendMode: 'multiply',
        opacity: 0.6,
      }}
    />
  );
});

InkCursor.displayName = 'InkCursor';
