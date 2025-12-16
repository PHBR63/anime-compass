import { Heart, Star, Play, MoreVertical } from 'lucide-react';
import { UserAnimeEntry } from '@/types/anime';
import { statusLabels, statusColors } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnimeCardProps {
  entry: UserAnimeEntry;
  onStatusChange?: (status: string) => void;
  onToggleFavorite?: () => void;
}

export function AnimeCard({ entry, onStatusChange, onToggleFavorite }: AnimeCardProps) {
  const { anime, status, rating, episodesWatched, isFavorite } = entry;
  const progress = anime.episodes ? (episodesWatched / anime.episodes) * 100 : 0;

  return (
    <div className="anime-card group">
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
        <img
          src={anime.imageUrl}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Top actions */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="glass"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleFavorite}
          >
            <Heart className={cn(
              "h-4 w-4 transition-colors",
              isFavorite && "fill-destructive text-destructive"
            )} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="glass" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card">
              <DropdownMenuItem onClick={() => onStatusChange?.('watching')}>
                Assistindo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.('completed')}>
                Completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.('paused')}>
                Pausado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.('planned')}>
                Planejado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-full border",
            statusColors[status]
          )}>
            {statusLabels[status]}
          </span>
        </div>
        
        {/* Rating */}
        {rating && (
          <div className="absolute bottom-16 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
            <Star className="h-3.5 w-3.5 text-warning fill-warning" />
            <span className="text-sm font-medium">{rating}</span>
          </div>
        )}
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display font-semibold text-sm line-clamp-2 mb-2">
            {anime.title}
          </h3>
          
          {/* Progress bar */}
          {anime.episodes && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Episódio {episodesWatched}</span>
                <span>/ {anime.episodes}</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
