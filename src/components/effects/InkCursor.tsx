/**
 * InkCursor - Componente de cursor com efeito de tinta sumi-e
 * Cria um rastro de tinta que segue o mouse, estilo caligrafia japonesa
 * Baseado no conceito SplashCursor do ReactBits
 */

import { useEffect, useRef, memo, useCallback } from 'react';

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
  /** Se o efeito está ativo */
  enabled?: boolean;
}

export const InkCursor = memo(({
  color = 'hsl(var(--ink))',
  size = 12,
  maxDrops = 50,
  lifetime = 2000,
  continuous = true,
  className = '',
  enabled = true,
}: InkCursorProps) => {
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
    
    // Cria gradiente radial para efeito de tinta
    const gradient = ctx.createRadialGradient(
      drop.x, drop.y, 0,
      drop.x, drop.y, currentSize
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color);
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
  }, [color, lifetime]);

  // Handler de movimento do mouse
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    
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
  }, [enabled, size, maxDrops, continuous]);

  useEffect(() => {
    if (!enabled) return;
    
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
  }, [enabled, handleMouseMove, drawInkDrop, lifetime]);

  if (!enabled) return null;

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
