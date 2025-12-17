import { Heart, Star, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LazyImage } from '@/components/ui/lazy-image';
import { Badge } from '@/components/ui/badge';
import { useCommonAnimes } from '@/hooks/useSocialStats';

// Mapear status para label em português
const statusLabels: Record<string, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Abandonado',
  not_started: 'Na lista',
};

// Componente para exibir animes em comum com amigos
export function CommonAnimes() {
  const { data: commonAnimes, isLoading } = useCommonAnimes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!commonAnimes || commonAnimes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Você ainda não tem animes em comum com seus amigos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {commonAnimes.map((anime, index) => (
        <div
          key={anime.malId}
          className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start gap-3">
            {/* Imagem do Anime */}
            <div className="w-14 h-20 rounded overflow-hidden flex-shrink-0">
              <LazyImage
                src={anime.imageUrl || '/placeholder.svg'}
                alt={anime.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info do Anime */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate mb-1">{anime.title}</p>
              
              {/* Meu status */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {statusLabels[anime.myStatus] || anime.myStatus}
                </Badge>
                {anime.myRating && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    {anime.myRating.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Amigos que também têm */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {anime.friends.slice(0, 4).map((friend) => (
                    <Avatar 
                      key={friend.userId} 
                      className="h-6 w-6 border-2 border-background"
                      title={`${friend.displayName} - ${statusLabels[friend.status] || friend.status}${friend.rating ? ` ⭐${friend.rating.toFixed(1)}` : ''}`}
                    >
                      <AvatarImage src={friend.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                        {friend.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {anime.friends.length} {anime.friends.length === 1 ? 'amigo também' : 'amigos também'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
