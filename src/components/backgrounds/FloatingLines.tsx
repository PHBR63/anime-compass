import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

// Propriedades do componente FloatingLines
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

/**
 * Componente de background com linhas flutuantes animadas usando Three.js
 * Cria um efeito visual de ondas com interação do mouse
 */
export function FloatingLines({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animationRef = useRef<number>();

  // Função para criar as linhas de uma onda
  const createWaveLines = useCallback((
    scene: THREE.Scene,
    waveType: 'top' | 'middle' | 'bottom',
    count: number,
    distance: number,
    colors: string[]
  ) => {
    const lines: THREE.Line[] = [];
    const baseY = waveType === 'top' ? 2 : waveType === 'middle' ? 0 : -2;
    const baseRotation = waveType === 'top' ? 0.3 : waveType === 'bottom' ? -0.3 : 0;

    for (let i = 0; i < count; i++) {
      const points: THREE.Vector3[] = [];
      const segments = 100;
      
      for (let j = 0; j <= segments; j++) {
        const x = (j / segments) * 20 - 10;
        const y = baseY + (i * distance * 0.1);
        points.push(new THREE.Vector3(x, y, 0));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const colorIndex = i % colors.length;
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(colors[colorIndex]),
        transparent: true,
        opacity: 0.6 - (i * 0.05),
      });

      const line = new THREE.Line(geometry, material);
      line.rotation.z = baseRotation;
      line.userData = { 
        baseY, 
        index: i, 
        waveType,
        phase: Math.random() * Math.PI * 2 
      };
      
      scene.add(line);
      lines.push(line);
    }

    return lines;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configuração da cena Three.js
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Criar linhas para cada onda habilitada
    const allLines: THREE.Line[] = [];
    const lineCountArray = Array.isArray(lineCount) ? lineCount : [lineCount, lineCount, lineCount];
    const lineDistanceArray = Array.isArray(lineDistance) ? lineDistance : [lineDistance, lineDistance, lineDistance];

    enabledWaves.forEach((wave, idx) => {
      const count = lineCountArray[idx] || lineCountArray[0];
      const dist = lineDistanceArray[idx] || lineDistanceArray[0];
      const lines = createWaveLines(scene, wave, count, dist, linesGradient);
      allLines.push(...lines);
    });

    // Manipulador de movimento do mouse
    const handleMouseMove = (event: MouseEvent) => {
      if (!interactive) return;
      mouseRef.current.targetX = (event.clientX / width) * 2 - 1;
      mouseRef.current.targetY = -(event.clientY / height) * 2 + 1;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Loop de animação
    const animate = (time: number) => {
      // Suavizar movimento do mouse
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * mouseDamping;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * mouseDamping;

      // Animar cada linha
      allLines.forEach((line) => {
        const { baseY, index, phase } = line.userData;
        const positions = (line.geometry as THREE.BufferGeometry).attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          
          // Onda base
          const wave = Math.sin(x * 0.5 + time * 0.001 * animationSpeed + phase) * 0.3;
          const wave2 = Math.sin(x * 0.3 + time * 0.0015 * animationSpeed + phase) * 0.2;
          
          // Efeito de dobra com o mouse
          let bendEffect = 0;
          if (interactive) {
            const dx = x / 10 - mouseRef.current.x;
            const dy = baseY / 5 - mouseRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bendRadius * 0.1) {
              bendEffect = (1 - distance / (bendRadius * 0.1)) * bendStrength * 0.1;
            }
          }
          
          // Parallax
          const parallaxOffset = parallax 
            ? mouseRef.current.x * parallaxStrength * (index * 0.1) 
            : 0;
          
          const y = baseY + wave + wave2 + bendEffect + (index * 0.15);
          positions.setY(i, y);
          positions.setX(i, x + parallaxOffset);
        }
        
        positions.needsUpdate = true;
      });

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Redimensionamento
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
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
      container.removeChild(renderer.domElement);
      renderer.dispose();
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
    createWaveLines
  ]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ mixBlendMode }}
    />
  );
}
