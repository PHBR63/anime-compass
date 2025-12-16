import { 
  Settings, 
  Share2, 
  Film, 
  PlayCircle, 
  Clock, 
  Star,
  Trophy,
  Heart,
  Edit3
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockStats, mockUserEntries } from '@/data/mockData';

export default function Profile() {
  const favoriteEntries = mockUserEntries.filter(e => e.isFavorite);
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Profile header */}
      <div className="glass-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative group">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-primary/20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">
                AN
              </AvatarFallback>
            </Avatar>
            <Button 
              variant="glass" 
              size="icon" 
              className="absolute bottom-0 right-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Anime Fan
            </h1>
            <p className="text-muted-foreground mt-1">
              @animefan • Membro desde Jan 2024
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">{mockStats.totalAnimes}</p>
                <p className="text-xs text-muted-foreground">Animes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">{mockStats.totalEpisodes}</p>
                <p className="text-xs text-muted-foreground">Episódios</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">2</p>
                <p className="text-xs text-muted-foreground">Conquistas</p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <Film className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{mockStats.totalAnimes}</p>
          <p className="text-xs text-muted-foreground">Total de Animes</p>
        </div>
        <div className="glass-card p-4 text-center">
          <PlayCircle className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{mockStats.totalEpisodes}</p>
          <p className="text-xs text-muted-foreground">Episódios</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{formatTime(mockStats.totalTimeMinutes)}</p>
          <p className="text-xs text-muted-foreground">Tempo Total</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Star className="h-6 w-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold">{mockStats.averageRating.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Nota Média</p>
        </div>
      </div>

      {/* Completion rate */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Taxa de Conclusão
          </h2>
          <span className="text-2xl font-bold text-gradient">
            {mockStats.completionRate.toFixed(0)}%
          </span>
        </div>
        <Progress value={mockStats.completionRate} className="h-3" />
        <p className="text-sm text-muted-foreground mt-2">
          {mockStats.byStatus.completed} de {mockStats.totalAnimes} animes completados
        </p>
      </div>

      {/* Favorites */}
      {favoriteEntries.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-destructive fill-destructive" />
            Favoritos
          </h2>
          
          <div className="flex gap-4 overflow-x-auto pb-2">
            {favoriteEntries.map((entry) => (
              <div key={entry.id} className="flex-shrink-0">
                <img
                  src={entry.anime.imageUrl}
                  alt={entry.anime.title}
                  className="w-20 h-28 object-cover rounded-lg"
                />
                <p className="text-xs text-center mt-1 max-w-20 truncate">
                  {entry.anime.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
