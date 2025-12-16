import { Heart, Star, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriendsActivity, formatRelativeTime, getActionText, FriendActivity } from '@/hooks/useFriendsActivity';
import { useFriends } from '@/hooks/useFriendships';

// Componente para exibir feed de atividades dos amigos
export function ActivityFeed() {
  const { data: friends } = useFriends();
  const { data: activities, isLoading } = useFriendsActivity();

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">
          Atividade dos Amigos
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Se não tem amigos
  if (!friends || friends.length === 0) {
    return (
      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">
          Atividade dos Amigos
        </h2>
        <p className="text-center text-muted-foreground py-8">
          Adicione amigos para ver as atividades deles aqui!
        </p>
      </div>
    );
  }

  // Se não tem atividades
  if (!activities || activities.length === 0) {
    return (
      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">
          Atividade dos Amigos
        </h2>
        <p className="text-center text-muted-foreground py-8">
          Seus amigos ainda não têm atividades recentes.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="font-display text-lg font-semibold mb-4">
        Atividade dos Amigos
      </h2>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <ActivityItem 
            key={activity.id} 
            activity={activity} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

// Item individual de atividade
function ActivityItem({ activity, index }: { activity: FriendActivity; index: number }) {
  const userName = activity.displayName || activity.username || 'Usuário';
  const actionText = getActionText(activity.action);
  const timeText = formatRelativeTime(activity.timestamp);

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Avatar do amigo */}
      <Avatar>
        <AvatarImage src={activity.avatarUrl || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {userName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* Conteúdo da atividade */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{userName}</span>
          {' '}{actionText}{' '}
          <span className="text-primary font-medium">{activity.animeTitle}</span>
        </p>
        
        {/* Detalhes adicionais */}
        <div className="flex items-center gap-3 mt-1">
          {activity.rating && (
            <span className="text-warning flex items-center gap-0.5 text-sm">
              {Array.from({ length: activity.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-warning" />
              ))}
            </span>
          )}
          
          {activity.action === 'watching' && activity.episodesWatched && activity.totalEpisodes && (
            <span className="text-xs text-muted-foreground">
              Ep. {activity.episodesWatched}/{activity.totalEpisodes}
            </span>
          )}
          
          <span className="text-xs text-muted-foreground">
            {timeText}
          </span>
        </div>
      </div>

      {/* Imagem do anime (se disponível) */}
      {activity.animeImage && (
        <img
          src={activity.animeImage}
          alt={activity.animeTitle}
          className="w-12 h-16 rounded-md object-cover hidden sm:block"
        />
      )}
    </div>
  );
}
