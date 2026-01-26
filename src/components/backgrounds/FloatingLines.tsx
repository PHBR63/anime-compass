import { useRef, useEffect, useCallback, memo } from 'react';

/**
 * Componente de background com linhas flutuantes animadas usando Canvas 2D
 * Substitui implementação Three.js por Canvas puro (~500KB economia)
 */

interface FloatingLinesProps {
  linesGradient?: string[];
  enabledWaves?: Array<'top' | 'middle' | 'bottom'>;
  lineCount?: number | number[];
  lineDistance?: number | number[];
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
  mixBlendMode?: React.CSSProperties['mixBlendMode'];
  className?: string;
}

interface Line {
  baseY: number;
  index: number;
  waveType: 'top' | 'middle' | 'bottom';
  phase: number;
  color: string;
  opacity: number;
}

export const FloatingLines = memo(function FloatingLines({
  linesGradient = ['#8b5cf6', '#06b6d4', '#10b981'],
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = 6,
  lineDistance = 5,
  animationSpeed = 1,
  interactive = true,
  bendRadius = 10,
  bendStrength = -5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen',
  className = '',
}: FloatingLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const animationRef = useRef<number>();
  const linesRef = useRef<Line[]>([]);

  // Inicializa as linhas
  const initLines = useCallback(() => {
    const lines: Line[] = [];
    const lineCountArray = Array.isArray(lineCount) ? lineCount : [lineCount, lineCount, lineCount];

    enabledWaves.forEach((waveType, waveIdx) => {
      const count = lineCountArray[waveIdx] || lineCountArray[0];
      const baseY = waveType === 'top' ? 0.2 : waveType === 'middle' ? 0.5 : 0.8;

      for (let i = 0; i < count; i++) {
        lines.push({
          baseY,
          index: i,
          waveType,
          phase: Math.random() * Math.PI * 2,
          color: linesGradient[i % linesGradient.length],
          opacity: 0.6 - i * 0.05,
        });
      }
    });

    linesRef.current = lines;
  }, [enabledWaves, lineCount, linesGradient]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configura tamanho do canvas
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    initLines();

    // Handler de movimento do mouse
    const handleMouseMove = (event: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = event.clientX / rect.width;
      mouseRef.current.targetY = event.clientY / rect.height;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Loop de animação
    let startTime = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Limpa canvas
      ctx.clearRect(0, 0, width, height);

      // Suaviza movimento do mouse
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * mouseDamping;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * mouseDamping;

      const distArray = Array.isArray(lineDistance) ? lineDistance : [lineDistance, lineDistance, lineDistance];

      // Desenha cada linha
      linesRef.current.forEach((line) => {
        const waveIdx = enabledWaves.indexOf(line.waveType);
        const dist = (distArray[waveIdx] || distArray[0]) * 0.01;

        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.globalAlpha = Math.max(0.1, line.opacity);
        ctx.lineWidth = 1.5;

        const segments = 100;

        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = (i / segments) * 2 - 1; // -1 a 1

          // Ondas base
          const time = elapsed * 0.001 * animationSpeed;
          const wave1 = Math.sin(normalizedX * 2 + time + line.phase) * 20;
          const wave2 = Math.sin(normalizedX * 1.5 + time * 1.5 + line.phase) * 15;

          // Efeito de dobra com o mouse
          let bendEffect = 0;
          if (interactive) {
            const dx = normalizedX - (mouseRef.current.x * 2 - 1);
            const dy = line.baseY - mouseRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const normalizedBendRadius = bendRadius * 0.1;
            if (distance < normalizedBendRadius) {
              bendEffect = (1 - distance / normalizedBendRadius) * bendStrength * 5;
            }
          }

          // Parallax
          const parallaxOffset = parallax
            ? (mouseRef.current.x - 0.5) * parallaxStrength * line.index * 10
            : 0;

          // Posição Y
          const baseYPos = line.baseY * height;
          const offset = line.index * dist * height;
          const y = baseYPos + wave1 + wave2 + bendEffect + offset;

          if (i === 0) {
            ctx.moveTo(x + parallaxOffset, y);
          } else {
            ctx.lineTo(x + parallaxOffset, y);
          }
        }

        ctx.stroke();
      });

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Redimensionamento
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [
    linesGradient,
    enabledWaves,
    lineCount,
    lineDistance,
    animationSpeed,
    interactive,
    bendRadius,
    bendStrength,
    mouseDamping,
    parallax,
    parallaxStrength,
    initLines,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ mixBlendMode }}
    />
  );
});
