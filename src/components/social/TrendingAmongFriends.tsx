import { TrendingUp, Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LazyImage } from '@/components/ui/lazy-image';
import { useTrendingAmongFriends } from '@/hooks/useSocialStats';

// Componente para exibir animes em alta entre amigos
export function TrendingAmongFriends() {
  const { data: trending, isLoading } = useTrendingAmongFriends();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!trending || trending.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum anime em alta entre seus amigos ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trending.map((anime, index) => (
        <div
          key={anime.malId}
          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all animate-slide-up cursor-pointer"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Imagem do Anime */}
          <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
            <LazyImage
              src={anime.imageUrl || '/placeholder.svg'}
              alt={anime.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info do Anime */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{anime.title}</p>
            <div className="flex items-center gap-1 mt-1">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">
                {anime.totalFriends} {anime.totalFriends === 1 ? 'amigo' : 'amigos'}
              </span>
            </div>
          </div>

          {/* Avatares dos amigos assistindo */}
          <div className="flex -space-x-2">
            {anime.friendsWatching.slice(0, 3).map((friend, i) => (
              <Avatar key={friend.userId} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={friend.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {friend.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {anime.friendsWatching.length > 3 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium">+{anime.friendsWatching.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
