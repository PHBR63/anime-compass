/**
 * Componente de fundo com partículas animadas
 * Cria um efeito visual de partículas flutuantes interativas
 */

import { useEffect, useRef, useMemo } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

interface ParticlesBackgroundProps {
  /** Número de partículas */
  particleCount?: number;
  /** Cor base das partículas (hue HSL) */
  baseHue?: number;
  /** Velocidade das partículas */
  speed?: number;
  /** Mostrar conexões entre partículas */
  showConnections?: boolean;
  /** Distância máxima para conexões */
  connectionDistance?: number;
  /** Classes CSS adicionais */
  className?: string;
}

export const ParticlesBackground = ({
  particleCount = 50,
  baseHue = 280,
  speed = 0.5,
  showConnections = true,
  connectionDistance = 150,
  className = '',
}: ParticlesBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  // Inicializa as partículas
  const initParticles = useMemo(() => {
    return (width: number, height: number): Particle[] => {
      return Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        hue: baseHue + (Math.random() - 0.5) * 40,
      }));
    };
  }, [particleCount, speed, baseHue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configura o tamanho do canvas
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        particlesRef.current = initParticles(canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Rastreia a posição do mouse
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Loop de animação
    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      // Atualiza e desenha partículas
      particles.forEach((particle, i) => {
        // Atualiza posição
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Efeito de atração ao mouse
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
          const force = (200 - dist) / 200;
          particle.vx += (dx / dist) * force * 0.02;
          particle.vy += (dy / dist) * force * 0.02;
        }

        // Limita velocidade
        const maxSpeed = speed * 2;
        const currentSpeed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);
        if (currentSpeed > maxSpeed) {
          particle.vx = (particle.vx / currentSpeed) * maxSpeed;
          particle.vy = (particle.vy / currentSpeed) * maxSpeed;
        }

        // Wraparound nas bordas
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Desenha conexões
        if (showConnections) {
          for (let j = i + 1; j < particles.length; j++) {
            const other = particles[j];
            const connDx = particle.x - other.x;
            const connDy = particle.y - other.y;
            const connDist = Math.sqrt(connDx * connDx + connDy * connDy);

            if (connDist < connectionDistance) {
              const opacity = (1 - connDist / connectionDistance) * 0.3;
              ctx.beginPath();
              ctx.strokeStyle = `hsla(${particle.hue}, 70%, 60%, ${opacity})`;
              ctx.lineWidth = 1;
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
            }
          }
        }

        // Desenha partícula
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 2
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 60%, ${particle.opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles, showConnections, connectionDistance, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-auto ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};
