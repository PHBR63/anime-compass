import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { AchievementCelebration } from '@/components/achievements/AchievementCelebration';
import { toast } from '@/hooks/use-toast';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Interface para dados da conquista
interface CelebrationData {
  name: string;
  description: string;
  icon: string | null;
  rarity: string | null;
}

// Interface do contexto
interface AchievementCelebrationContextType {
  celebrate: (data: CelebrationData) => void;
}

// Cria o contexto
const AchievementCelebrationContext = createContext<AchievementCelebrationContextType | null>(null);

// Hook para usar o contexto de celebração
export function useAchievementCelebrationContext() {
  const context = useContext(AchievementCelebrationContext);
  if (!context) {
    throw new Error('useAchievementCelebrationContext must be used within AchievementCelebrationProvider');
  }
  return context;
}

// Provider que gerencia celebrações globalmente
export function AchievementCelebrationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const previousAchievementIds = useRef<Set<string>>(new Set());
  const isInitialized = useRef(false);

  // Função para disparar celebração
  const celebrate = useCallback((data: CelebrationData) => {
    // Mostra toast primeiro
    toast({
      title: '🏆 Nova Conquista!',
      description: data.name,
    });

    // Depois mostra a celebração completa
    setCelebration(data);
  }, []);

  // Função para fechar celebração
  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  // Monitora novas conquistas em tempo real
  useEffect(() => {
    if (!user) {
      previousAchievementIds.current.clear();
      isInitialized.current = false;
      return;
    }

    // Busca conquistas iniciais do usuário
    const initializeAchievements = async () => {
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (data) {
        previousAchievementIds.current = new Set(data.map(a => a.achievement_id));
      }
      isInitialized.current = true;
    };

    initializeAchievements();

    // Configura subscription para novas conquistas
    const channel = supabase
      .channel('achievement-celebration')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Verifica se já foi inicializado (evita celebrar conquistas antigas)
          if (!isInitialized.current) return;

          const newAchievementId = payload.new.achievement_id;

          // Verifica se é uma conquista realmente nova
          if (previousAchievementIds.current.has(newAchievementId)) return;

          // Adiciona ao set de conquistas conhecidas
          previousAchievementIds.current.add(newAchievementId);

          // Busca detalhes da conquista
          const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('id', newAchievementId)
            .single();

          if (achievement) {
            celebrate({
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              rarity: achievement.rarity,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, celebrate]);

  return (
    <AchievementCelebrationContext.Provider value={{ celebrate }}>
      {children}
      <AchievementCelebration celebration={celebration} onClose={closeCelebration} />
    </AchievementCelebrationContext.Provider>
  );
}
