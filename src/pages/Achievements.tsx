import { useState } from 'react';
import { Trophy, Lock, Star, Film, Clock, Heart, Zap, Users, BookOpen, List, CheckCircle, Award, Medal, Crown, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAchievements, type AchievementWithStatus } from '@/hooks/useAchievements';
import { ParticlesBackground } from '@/components/backgrounds';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
// Mapeamento de ícones por código da conquista
const iconMap: Record<string, React.ElementType> = {
  first_anime: Star,
  anime_10: Film,
  anime_50: Heart,
  anime_100: Crown,
  first_complete: CheckCircle,
  complete_10: Medal,
  complete_50: Trophy,
  first_review: BookOpen,
  review_10: Award,
  first_friend: Users,
  friends_10: Sparkles,
  first_list: List,
};

// Cores por raridade
const rarityColors: Record<string, string> = {
  common: 'from-slate-400 to-slate-600',
  uncommon: 'from-emerald-400 to-emerald-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600',
};

// Bordas por raridade
const rarityBorder: Record<string, string> = {
  common: 'border-slate-500/30',
  uncommon: 'border-emerald-500/30',
  rare: 'border-blue-500/30',
  epic: 'border-purple-500/30',
  legendary: 'border-amber-500/30 animate-pulse-glow',
};

// Labels de categoria
const categoryLabels: Record<string, string> = {
  collection: 'Coleção',
  progress: 'Progresso',
  social: 'Social',
};

// Componente de card de conquista
function AchievementCard({ achievement, index }: { achievement: AchievementWithStatus; index: number }) {
  const Icon = iconMap[achievement.code] || Trophy;
  const rarity = achievement.rarity || 'common';
  const progressPercent = achievement.progress 
    ? (achievement.progress.current / achievement.progress.target) * 100 
    : 0;

  return (
    <div
      className={cn(
        "glass-card p-4 sm:p-5 transition-all duration-300 animate-scale-in h-full",
        achievement.unlocked 
          ? rarityBorder[rarity]
          : "opacity-60 grayscale-[30%]",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className={cn(
          "p-2.5 sm:p-3 rounded-xl bg-gradient-to-br shrink-0",
          achievement.unlocked 
            ? rarityColors[rarity]
            : "from-muted to-muted"
        )}>
          {achievement.unlocked ? (
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          ) : (
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          )}
        </div>
        
        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-sm sm:text-base leading-tight">
              {achievement.name}
            </h3>
            {achievement.icon && (
              <span className="text-base sm:text-lg">{achievement.icon}</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {achievement.description}
          </p>
          
          {/* Barra de progresso para conquistas não desbloqueadas */}
          {achievement.progress && !achievement.unlocked && (
            <div className="mt-2 sm:mt-3">
              <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mb-1">
                <span>{achievement.progress.current} / {achievement.progress.target}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-1 sm:h-1.5"
              />
            </div>
          )}
          
          {/* Data de desbloqueio */}
          {achievement.unlocked && achievement.unlocked_at && (
            <p className="text-[10px] sm:text-xs text-primary mt-2 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {new Date(achievement.unlocked_at).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de skeleton para loading
function AchievementSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-1.5 w-full mt-3" />
        </div>
      </div>
    </div>
  );
}

export default function Achievements() {
  const { data: achievements, isLoading, refetch } = useAchievements();
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Calcular estatísticas
  const unlockedCount = achievements?.filter(a => a.unlocked).length || 0;
  const totalCount = achievements?.length || 0;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  // Função para sincronizar conquistas pendentes
  const syncAchievements = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      const { error } = await supabase.rpc('check_and_unlock_achievements', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      // Recarrega os dados após sincronização
      await refetch();
      
      toast({
        title: "Conquistas sincronizadas!",
        description: "Suas conquistas foram verificadas e atualizadas.",
      });
    } catch (error) {
      console.error('Erro ao sincronizar conquistas:', error);
      toast({
        title: "Erro ao sincronizar",
        description: "Não foi possível verificar suas conquistas.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Agrupar conquistas por categoria
  const groupedAchievements = achievements?.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, AchievementWithStatus[]>) || {};

  return (
    <div className="space-y-8 pt-12 md:pt-0 relative min-h-screen">
      {/* Fundo de partículas animadas */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <ParticlesBackground 
          particleCount={40} 
          baseHue={45} 
          speed={0.3}
          connectionDistance={120}
        />
      </div>
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Conquistas
          </h1>
          <p className="text-muted-foreground mt-1">
            Desbloqueie conquistas e mostre seu progresso
          </p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={syncAchievements}
            disabled={isSyncing || isLoading || !user}
            className="gap-2"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          
          <div className="glass-card px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
            <div>
              {isLoading ? (
                <Skeleton className="h-6 sm:h-7 w-10" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold text-gradient">{unlockedCount}</p>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground">de {totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progresso geral */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso Geral</span>
          {isLoading ? (
            <Skeleton className="h-4 w-10" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {Math.round(progressPercent)}%
            </span>
          )}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <AchievementSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Lista de conquistas agrupadas por categoria */}
      {!isLoading && Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
        <div key={category} className="space-y-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            {categoryLabels[category] || category}
            <span className="text-sm font-normal text-muted-foreground">
              ({categoryAchievements.filter(a => a.unlocked).length}/{categoryAchievements.length})
            </span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {categoryAchievements.map((achievement, index) => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                index={index} 
              />
            ))}
          </div>
        </div>
      ))}

      {/* Estado vazio */}
      {!isLoading && (!achievements || achievements.length === 0) && (
        <div className="glass-card p-12 text-center">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2">
            Nenhuma conquista disponível
          </h3>
          <p className="text-muted-foreground">
            As conquistas serão carregadas em breve.
          </p>
        </div>
      )}
    </div>
  );
}
