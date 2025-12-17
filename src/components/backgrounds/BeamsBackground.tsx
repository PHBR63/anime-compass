import { useEffect, useRef, useCallback } from 'react';

/**
 * Componente BeamsBackground - Efeito de feixes de luz animados
 * Versão leve usando Canvas 2D
 */

interface BeamsBackgroundProps {
  beamCount?: number;
  beamWidth?: number;
  beamHeight?: number;
  color?: string;
  speed?: number;
  rotation?: number;
  className?: string;
}

interface Beam {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  delay: number;
}

export const BeamsBackground = ({
  beamCount = 15,
  beamWidth = 2,
  beamHeight = 150,
  color = 'hsl(183, 100%, 50%)',
  speed = 1,
  rotation = -35,
  className = '',
}: BeamsBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationRef = useRef<number>(0);

  // Inicializa os feixes
  const initBeams = useCallback((width: number, height: number) => {
    const beams: Beam[] = [];
    for (let i = 0; i < beamCount; i++) {
      beams.push({
        x: Math.random() * width * 1.5 - width * 0.25,
        y: -beamHeight - Math.random() * height,
        width: beamWidth + Math.random() * 2,
        height: beamHeight + Math.random() * 100,
        speed: (0.5 + Math.random() * 1.5) * speed,
        opacity: 0.1 + Math.random() * 0.3,
        delay: Math.random() * 100,
      });
    }
    beamsRef.current = beams;
  }, [beamCount, beamWidth, beamHeight, speed]);

  // Desenha os feixes
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Aplica rotação
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);

    beamsRef.current.forEach((beam, index) => {
      // Atualiza posição
      if (time > beam.delay) {
        beam.y += beam.speed;
        
        // Reset quando sai da tela
        if (beam.y > height + beam.height) {
          beam.y = -beam.height;
          beam.x = Math.random() * width * 1.5 - width * 0.25;
          beam.delay = time + Math.random() * 50;
        }
      }

      // Desenha o feixe com gradiente
      const gradient = ctx.createLinearGradient(
        beam.x, beam.y,
        beam.x, beam.y + beam.height
      );
      gradient.addColorStop(0, `hsla(183, 100%, 50%, 0)`);
      gradient.addColorStop(0.1, `hsla(183, 100%, 50%, ${beam.opacity})`);
      gradient.addColorStop(0.9, `hsla(183, 100%, 50%, ${beam.opacity})`);
      gradient.addColorStop(1, `hsla(183, 100%, 50%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(beam.x, beam.y, beam.width, beam.height, beam.width / 2);
      ctx.fill();
    });

    ctx.restore();
  }, [rotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configura canvas para tela inteira
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      initBeams(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    // Loop de animação
    let startTime = performance.now();
    const animate = (time: number) => {
      const elapsed = (time - startTime) / 16; // Normaliza para ~60fps
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height, elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Verifica preferência de reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Desenha estado estático
      draw(ctx, canvas.width, canvas.height, 1000);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initBeams, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.6 }}
    />
  );
};
