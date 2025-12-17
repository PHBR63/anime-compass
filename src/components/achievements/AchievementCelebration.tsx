import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';

// Interface para dados da conquista celebrada
interface CelebrationData {
  name: string;
  description: string;
  icon: string | null;
  rarity: string | null;
}

// Configuração de cores por raridade
const rarityColors: Record<string, { primary: string; secondary: string; glow: string }> = {
  comum: {
    primary: 'hsl(var(--muted-foreground))',
    secondary: 'hsl(var(--muted))',
    glow: 'hsl(var(--muted-foreground) / 0.3)',
  },
  raro: {
    primary: 'hsl(210, 100%, 60%)',
    secondary: 'hsl(210, 100%, 80%)',
    glow: 'hsl(210, 100%, 60% / 0.4)',
  },
  épico: {
    primary: 'hsl(280, 100%, 65%)',
    secondary: 'hsl(280, 100%, 85%)',
    glow: 'hsl(280, 100%, 65% / 0.4)',
  },
  lendário: {
    primary: 'hsl(45, 100%, 50%)',
    secondary: 'hsl(45, 100%, 80%)',
    glow: 'hsl(45, 100%, 50% / 0.5)',
  },
};

// Componente de partícula individual
const Particle = ({ delay, color }: { delay: number; color: string }) => {
  const randomX = Math.random() * 400 - 200;
  const randomY = Math.random() * 300 - 150;
  const randomRotation = Math.random() * 720 - 360;
  const randomScale = Math.random() * 0.5 + 0.5;
  const shape = Math.random() > 0.5 ? 'circle' : 'square';

  return (
    <motion.div
      className={`absolute ${shape === 'circle' ? 'rounded-full' : 'rounded-sm rotate-45'}`}
      style={{
        width: 8 * randomScale,
        height: 8 * randomScale,
        backgroundColor: color,
        left: '50%',
        top: '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
      animate={{
        x: randomX,
        y: randomY,
        opacity: [1, 1, 0],
        scale: [0, 1, 0.5],
        rotate: randomRotation,
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: 'easeOut',
      }}
    />
  );
};

// Componente de estrela animada
const AnimatedStar = ({ delay, size, x, y }: { delay: number; size: number; x: number; y: number }) => (
  <motion.div
    className="absolute"
    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1.2, 0],
      rotate: [0, 180],
    }}
    transition={{
      duration: 1.2,
      delay,
      ease: 'easeOut',
    }}
  >
    <Star className="text-yellow-400 fill-yellow-400" size={size} />
  </motion.div>
);

// Hook para gerenciar celebrações de conquistas
export function useAchievementCelebration() {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  // Função para disparar celebração
  const celebrate = useCallback((data: CelebrationData) => {
    setCelebration(data);
  }, []);

  // Função para fechar celebração
  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  return { celebration, celebrate, closeCelebration };
}

// Componente principal de celebração
interface AchievementCelebrationProps {
  celebration: CelebrationData | null;
  onClose: () => void;
}

export function AchievementCelebration({ celebration, onClose }: AchievementCelebrationProps) {
  // Fecha automaticamente após 4 segundos
  useEffect(() => {
    if (celebration) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [celebration, onClose]);

  const colors = celebration?.rarity 
    ? rarityColors[celebration.rarity.toLowerCase()] || rarityColors.comum
    : rarityColors.comum;

  // Gera partículas com cores variadas
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.3,
    color: i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : 'hsl(var(--primary))',
  }));

  // Gera estrelas decorativas
  const stars = [
    { delay: 0.1, size: 24, x: -80, y: -60 },
    { delay: 0.2, size: 18, x: 90, y: -40 },
    { delay: 0.3, size: 20, x: -60, y: 50 },
    { delay: 0.4, size: 16, x: 70, y: 60 },
    { delay: 0.15, size: 22, x: 0, y: -80 },
  ];

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay escuro */}
          <motion.div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Container de partículas */}
          <div className="absolute inset-0 overflow-hidden">
            {particles.map((particle) => (
              <Particle key={particle.id} delay={particle.delay} color={particle.color} />
            ))}
          </div>

          {/* Estrelas animadas */}
          {stars.map((star, i) => (
            <AnimatedStar key={i} {...star} />
          ))}

          {/* Card da conquista */}
          <motion.div
            className="relative z-10 pointer-events-auto"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl blur-2xl"
              style={{ backgroundColor: colors.glow }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Card principal */}
            <motion.div
              className="relative glass-card p-6 sm:p-8 rounded-2xl border-2 max-w-sm mx-4"
              style={{ borderColor: colors.primary }}
              animate={{
                boxShadow: [
                  `0 0 20px ${colors.glow}`,
                  `0 0 40px ${colors.glow}`,
                  `0 0 20px ${colors.glow}`,
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Ícone de conquista */}
              <motion.div
                className="flex justify-center mb-4"
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{
                    background: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`,
                    boxShadow: `0 0 30px ${colors.glow}`,
                  }}
                >
                  {celebration.icon || <Trophy className="w-10 h-10 text-background" />}
                </div>
              </motion.div>

              {/* Texto de conquista desbloqueada */}
              <motion.div
                className="flex items-center justify-center gap-2 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
                <span className="text-sm font-medium uppercase tracking-wider" style={{ color: colors.primary }}>
                  Conquista Desbloqueada!
                </span>
                <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
              </motion.div>

              {/* Nome da conquista */}
              <motion.h3
                className="text-xl sm:text-2xl font-bold text-center mb-2 text-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {celebration.name}
              </motion.h3>

              {/* Descrição */}
              <motion.p
                className="text-sm text-muted-foreground text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {celebration.description}
              </motion.p>

              {/* Badge de raridade */}
              {celebration.rarity && (
                <motion.div
                  className="flex justify-center mt-4"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium uppercase"
                    style={{
                      backgroundColor: `${colors.primary}20`,
                      color: colors.primary,
                      border: `1px solid ${colors.primary}`,
                    }}
                  >
                    {celebration.rarity}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementCelebration;
