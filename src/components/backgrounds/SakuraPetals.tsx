/**
 * SakuraPetals - Componente de background com pétalas de sakura caindo
 * Otimizado: pausa quando fora do viewport e reduz pétalas em mobile
 */

import { useEffect, useRef, memo, useCallback, useState } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
}

interface SakuraPetalsProps {
  petalCount?: number;
  colors?: string[];
  speed?: number;
  windStrength?: number;
  minSize?: number;
  maxSize?: number;
  opacity?: number;
  className?: string;
}

export const SakuraPetals = memo(({
  petalCount = 50,
  colors = ['hsl(350, 100%, 85%)', 'hsl(350, 90%, 80%)', 'hsl(350, 80%, 75%)', 'hsl(355, 100%, 90%)'],
  speed = 1,
  windStrength = 0.5,
  minSize = 8,
  maxSize = 16,
  opacity = 0.8,
  className = '',
}: SakuraPetalsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<Petal[]>([]);
  const animationRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(false);

  // Reduz pétalas em mobile para economizar CPU
  const effectivePetalCount = typeof window !== 'undefined' && window.innerWidth < 768
    ? Math.min(petalCount, 15)
    : petalCount;

  // Intersection Observer para pausar quando fora do viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Cria uma pétala com propriedades aleatórias
  const createPetal = useCallback((canvas: HTMLCanvasElement, startFromTop = true): Petal => {
    return {
      x: Math.random() * canvas.width,
      y: startFromTop ? -20 : Math.random() * canvas.height,
      size: minSize + Math.random() * (maxSize - minSize),
      speedX: (Math.random() - 0.5) * windStrength,
      speedY: (0.5 + Math.random() * 0.5) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.4 + Math.random() * 0.6,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, [colors, speed, windStrength, minSize, maxSize]);

  // Desenha uma pétala de sakura
  const drawPetal = useCallback((ctx: CanvasRenderingContext2D, petal: Petal) => {
    ctx.save();
    ctx.translate(petal.x, petal.y);
    ctx.rotate(petal.rotation);
    ctx.globalAlpha = petal.opacity * opacity;
    ctx.beginPath();
    ctx.fillStyle = petal.color;
    const size = petal.size;
    ctx.moveTo(0, -size / 2);
    ctx.bezierCurveTo(size / 2, -size / 2, size / 2, size / 2, 0, size / 2);
    ctx.bezierCurveTo(-size / 2, size / 2, -size / 2, -size / 2, 0, -size / 2);
    ctx.fill();
    ctx.restore();
  }, [opacity]);

  // Inicializa e anima as pétalas (só quando visível)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) {
      // Cancela animação quando invisível
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inicializa pétalas
    if (petalsRef.current.length === 0) {
      petalsRef.current = Array.from({ length: effectivePetalCount }, () => createPetal(canvas, false));
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      petalsRef.current.forEach((petal, index) => {
        petal.x += petal.speedX + Math.sin(Date.now() * 0.001 + index) * windStrength * 0.3;
        petal.y += petal.speedY;
        petal.rotation += petal.rotationSpeed;

        if (petal.y > canvas.offsetHeight + 20 || petal.x < -20 || petal.x > canvas.offsetWidth + 20) {
          petalsRef.current[index] = createPetal(canvas, true);
        }

        drawPetal(ctx, petal);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [effectivePetalCount, createPetal, drawPetal, windStrength, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ mixBlendMode: 'screen' }}
    />
  );
});

SakuraPetals.displayName = 'SakuraPetals';
