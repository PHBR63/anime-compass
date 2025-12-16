import { 
  Film, 
  PlayCircle, 
  Clock, 
  Star, 
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { mockStats, mockUserEntries } from '@/data/mockData';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const watchingEntries = mockUserEntries.filter(e => e.status === 'watching');
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu progresso e descubra novos animes
          </p>
        </div>
        
        <Button variant="glow" className="w-fit">
          <Sparkles className="h-4 w-4" />
          Descobrir Novos
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Animes"
          value={mockStats.totalAnimes}
          icon={Film}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          label="Episódios Assistidos"
          value={mockStats.totalEpisodes}
          icon={PlayCircle}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          label="Tempo Total"
          value={formatTime(mockStats.totalTimeMinutes)}
          icon={Clock}
        />
        <StatCard
          label="Nota Média"
          value={mockStats.averageRating.toFixed(1)}
          icon={Star}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <StatusChart data={mockStats.byStatus} />
        <RecentActivity entries={mockUserEntries} />
      </div>

      {/* Currently Watching */}
      {watchingEntries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Assistindo Agora
            </h2>
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {watchingEntries.map((entry, index) => (
              <div 
                key={entry.id}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <AnimeCard entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
