import { 
  Film, 
  PlayCircle, 
  Clock, 
  Star, 
  TrendingUp,
  Sparkles,
  Plus,
  LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { DetailedStatsCard } from '@/components/dashboard/DetailedStatsCard';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { RecommendationsSection } from '@/components/anime/RecommendationsSection';
import { SessionExpiredCard, isSessionExpiredError } from '@/components/ui/SessionExpiredCard';
import { Button } from '@/components/ui/button';
import { useAnimeEntries, useUserStats } from '@/hooks/useAnimeEntries';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { AuroraBackground } from '@/components/backgrounds';
import { AnimatedContent } from '@/components/animations';

/**
 * Página Dashboard - Visão geral do usuário com estatísticas e atividade recente
 * Inclui efeito Aurora no background para visual premium
 */

export default function Dashboard() {
  const { data: entries, isLoading: entriesLoading, error: entriesError } = useAnimeEntries('watching');
  const { data: stats, isLoading: statsLoading, error: statsError } = useUserStats();
  const { data: profile } = useProfile();
  
  // Formata tempo total baseado em episódios assistidos
  const formatTime = (episodes: number) => {
    const minutes = episodes * 24; // Duração média de episódio de anime
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  const isLoading = entriesLoading || statsLoading;

  // Verifica se há erro de sessão expirada
  if (isSessionExpiredError(entriesError) || isSessionExpiredError(statsError)) {
    return (
      <div className="space-y-6 md:space-y-8 pt-14 md:pt-0">
        <SessionExpiredCard 
          title="Dashboard"
          icon={<LayoutDashboard className="h-5 w-5 text-primary" />}
          message="Sua sessão expirou. Faça login novamente para acessar seu dashboard."
        />
      </div>
    );
  }

  return (
    <div className="relative space-y-6 md:space-y-8 pt-14 md:pt-0">
      {/* Aurora Background - efeito visual premium */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <AuroraBackground 
          colorStops={['hsl(183, 100%, 50%)', 'hsl(280, 100%, 65%)', 'hsl(199, 89%, 48%)']}
          speed={0.5}
          blend={0.4}
        />
      </div>

      {/* Header com animação */}
      <AnimatedContent direction="down" duration={0.5}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold truncate">
              Olá, {profile?.display_name || profile?.username || 'Otaku'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Acompanhe seu progresso e descubra novos animes
            </p>
          </div>
          
          <Link to="/discover" className="shrink-0">
            <Button variant="glow" className="w-full sm:w-fit">
              <Sparkles className="h-4 w-4" />
              Descobrir Novos
            </Button>
          </Link>
        </div>
      </AnimatedContent>

      {/* Stats Grid com animação escalonada */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <AnimatedContent direction="up" delay={0} duration={0.4}>
              <StatCard
                label="Total de Animes"
                value={stats?.totalAnimes || 0}
                icon={Film}
              />
            </AnimatedContent>
            <AnimatedContent direction="up" delay={0.1} duration={0.4}>
              <StatCard
                label="Episódios Assistidos"
                value={stats?.totalEpisodes || 0}
                icon={PlayCircle}
              />
            </AnimatedContent>
            <AnimatedContent direction="up" delay={0.2} duration={0.4}>
              <StatCard
                label="Tempo Total"
                value={formatTime(stats?.totalEpisodes || 0)}
                icon={Clock}
              />
            </AnimatedContent>
            <AnimatedContent direction="up" delay={0.3} duration={0.4}>
              <StatCard
                label="Nota Média"
                value={stats?.averageRating || '0.0'}
                icon={Star}
              />
            </AnimatedContent>
          </>
        )}
      </div>

      {/* Estatísticas Detalhadas */}
      <AnimatedContent direction="up" delay={0.4} duration={0.5}>
        {isLoading ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : (
          <DetailedStatsCard />
        )}
      </AnimatedContent>

      {/* Atividade Recente */}
      <AnimatedContent direction="up" delay={0.5} duration={0.5}>
        {isLoading ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : (
          <RecentActivity />
        )}
      </AnimatedContent>

      {/* Recomendações Personalizadas */}
      <AnimatedContent direction="up" delay={0.6} duration={0.5}>
        <RecommendationsSection />
      </AnimatedContent>

      {/* Currently Watching */}
      <AnimatedContent direction="up" delay={0.7} duration={0.5}>
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg md:text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Assistindo Agora
            </h2>
            <Link to="/list">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm">
                Ver todos
              </Button>
            </Link>
          </div>
          
          {entriesLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : entries && entries.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {entries.slice(0, 4).map((entry, index) => (
                <div 
                  key={entry.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <AnimeCard entry={entry} />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Você ainda não está assistindo nenhum anime
              </p>
              <Link to="/discover">
                <Button variant="glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Anime
                </Button>
              </Link>
            </div>
          )}
        </section>
      </AnimatedContent>
    </div>
  );
}
