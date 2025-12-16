import { 
  Film, 
  PlayCircle, 
  Clock, 
  Star, 
  TrendingUp,
  Sparkles,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { RecommendationsSection } from '@/components/anime/RecommendationsSection';
import { Button } from '@/components/ui/button';
import { useAnimeEntries, useUserStats } from '@/hooks/useAnimeEntries';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: entries, isLoading: entriesLoading } = useAnimeEntries('watching');
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: profile } = useProfile();
  
  const formatTime = (episodes: number) => {
    const minutes = episodes * 24; // Average anime episode duration
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  const statusChartData = stats ? [
    { name: 'Assistindo', value: stats.watching, color: 'hsl(var(--primary))' },
    { name: 'Completo', value: stats.completed, color: 'hsl(var(--accent))' },
    { name: 'Pausado', value: stats.paused, color: 'hsl(var(--muted))' },
    { name: 'Abandonado', value: stats.dropped, color: 'hsl(var(--destructive))' },
    { name: 'Planejado', value: stats.notStarted, color: 'hsl(var(--secondary))' },
  ].filter(d => d.value > 0) : [];

  const isLoading = entriesLoading || statsLoading;

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Olá, {profile?.display_name || profile?.username || 'Otaku'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu progresso e descubra novos animes
          </p>
        </div>
        
        <Link to="/discover">
          <Button variant="glow" className="w-fit">
            <Sparkles className="h-4 w-4" />
            Descobrir Novos
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="Total de Animes"
              value={stats?.totalAnimes || 0}
              icon={Film}
            />
            <StatCard
              label="Episódios Assistidos"
              value={stats?.totalEpisodes || 0}
              icon={PlayCircle}
            />
            <StatCard
              label="Tempo Total"
              value={formatTime(stats?.totalEpisodes || 0)}
              icon={Clock}
            />
            <StatCard
              label="Nota Média"
              value={stats?.averageRating || '0.0'}
              icon={Star}
            />
          </>
        )}
      </div>

      {/* Charts and Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </>
        ) : (
          <>
            <StatusChart data={statusChartData} />
            <RecentActivity />
          </>
        )}
      </div>

      {/* Recomendações Personalizadas */}
      <RecommendationsSection />

      {/* Currently Watching */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Assistindo Agora
          </h2>
          <Link to="/list">
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </Link>
        </div>
        
        {entriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
