import { Trophy, Lock, Star, Film, Clock, Heart, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const achievements = [
  {
    id: '1',
    name: 'Primeiro Passo',
    description: 'Adicione seu primeiro anime à lista',
    icon: Star,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Maratonista',
    description: 'Assista 100 episódios',
    icon: Film,
    rarity: 'uncommon',
    unlocked: true,
    unlockedAt: '2024-02-15',
    progress: { current: 161, target: 100 },
  },
  {
    id: '3',
    name: 'Dedicado',
    description: 'Assista 1000 episódios',
    icon: Zap,
    rarity: 'rare',
    unlocked: false,
    progress: { current: 161, target: 1000 },
  },
  {
    id: '4',
    name: 'Colecionador',
    description: 'Tenha 50 animes na lista',
    icon: Heart,
    rarity: 'uncommon',
    unlocked: false,
    progress: { current: 6, target: 50 },
  },
  {
    id: '5',
    name: 'Veterano',
    description: 'Assista por 100 horas',
    icon: Clock,
    rarity: 'rare',
    unlocked: false,
    progress: { current: 64, target: 100 },
  },
  {
    id: '6',
    name: 'Lendário',
    description: 'Complete 100 animes',
    icon: Trophy,
    rarity: 'legendary',
    unlocked: false,
    progress: { current: 2, target: 100 },
  },
];

const rarityColors = {
  common: 'from-slate-400 to-slate-600',
  uncommon: 'from-emerald-400 to-emerald-600',
  rare: 'from-blue-400 to-blue-600',
  legendary: 'from-amber-400 to-amber-600',
};

const rarityBorder = {
  common: 'border-slate-500/30',
  uncommon: 'border-emerald-500/30',
  rare: 'border-blue-500/30',
  legendary: 'border-amber-500/30 animate-pulse-glow',
};

export default function Achievements() {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  
  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Conquistas
          </h1>
          <p className="text-muted-foreground mt-1">
            Desbloqueie conquistas e mostre seu progresso
          </p>
        </div>
        
        <div className="glass-card px-6 py-3 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-warning" />
          <div>
            <p className="text-2xl font-bold text-gradient">{unlockedCount}</p>
            <p className="text-xs text-muted-foreground">de {achievements.length}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso Geral</span>
          <span className="text-sm text-muted-foreground">
            {Math.round((unlockedCount / achievements.length) * 100)}%
          </span>
        </div>
        <Progress value={(unlockedCount / achievements.length) * 100} className="h-2" />
      </div>

      {/* Achievements grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement, index) => {
          const Icon = achievement.icon;
          return (
            <div
              key={achievement.id}
              className={cn(
                "glass-card p-6 transition-all duration-300 animate-scale-in",
                achievement.unlocked 
                  ? rarityBorder[achievement.rarity as keyof typeof rarityBorder]
                  : "opacity-60",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl bg-gradient-to-br",
                  achievement.unlocked 
                    ? rarityColors[achievement.rarity as keyof typeof rarityColors]
                    : "from-muted to-muted"
                )}>
                  {achievement.unlocked ? (
                    <Icon className="h-6 w-6 text-white" />
                  ) : (
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold">{achievement.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {achievement.description}
                  </p>
                  
                  {achievement.progress && !achievement.unlocked && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{achievement.progress.current}</span>
                        <span>{achievement.progress.target}</span>
                      </div>
                      <Progress 
                        value={(achievement.progress.current / achievement.progress.target) * 100} 
                        className="h-1.5"
                      />
                    </div>
                  )}
                  
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs text-primary mt-2">
                      Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
