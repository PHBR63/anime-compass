import { Trophy, Star, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriendsRanking } from '@/hooks/useSocialStats';

// Componente para exibir ranking de amigos por quantidade de animes
export function FriendsRanking() {
  const { data: ranking, isLoading } = useFriendsRanking();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ranking || ranking.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Adicione amigos para ver o ranking!</p>
      </div>
    );
  }

  // Medalhas para os primeiros colocados
  const getMedal = (position: number) => {
    switch (position) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${position + 1}.`;
    }
  };

  return (
    <div className="space-y-3">
      {ranking.map((friend, index) => (
        <div
          key={friend.userId}
          className={`flex items-center gap-3 p-3 rounded-lg transition-all animate-slide-up ${
            index < 3 
              ? 'bg-gradient-to-r from-primary/10 to-transparent border border-primary/20' 
              : 'bg-secondary/30 hover:bg-secondary/50'
          }`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Posição/Medalha */}
          <span className={`text-xl font-bold min-w-[2rem] ${index >= 3 ? 'text-muted-foreground' : ''}`}>
            {getMedal(index)}
          </span>

          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={friend.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {friend.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Nome */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{friend.displayName}</p>
            {friend.username && (
              <p className="text-xs text-muted-foreground">@{friend.username}</p>
            )}
          </div>

          {/* Estatísticas */}
          <div className="text-right">
            <p className="font-semibold text-primary">
              {friend.totalAnimes} <span className="text-xs font-normal text-muted-foreground">animes</span>
            </p>
            {friend.averageRating && (
              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {friend.averageRating.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
