import { Search, Users, UserPlus, MessageSquare, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const mockFriends = [
  { id: '1', name: 'Sakura M.', avatar: '', animesCount: 156, status: 'online' },
  { id: '2', name: 'Naruto U.', avatar: '', animesCount: 89, status: 'offline' },
  { id: '3', name: 'Gon F.', avatar: '', animesCount: 234, status: 'online' },
];

const mockActivity = [
  { id: '1', user: 'Sakura M.', action: 'completou', anime: 'Demon Slayer', time: '2h atrás' },
  { id: '2', user: 'Gon F.', action: 'avaliou', anime: 'Hunter x Hunter', rating: 5, time: '5h atrás' },
  { id: '3', user: 'Naruto U.', action: 'adicionou', anime: 'One Punch Man', time: '1 dia atrás' },
];

export default function Social() {
  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Social
          </h1>
          <p className="text-muted-foreground mt-1">
            Conecte-se com outros fãs de anime
          </p>
        </div>
        
        <Button variant="glow">
          <UserPlus className="h-4 w-4" />
          Encontrar Amigos
        </Button>
      </div>

      {/* Search users */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários..."
          className="pl-10 bg-secondary/50 border-border/50"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Friends list */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Amigos
              </h2>
              <span className="text-sm text-muted-foreground">
                {mockFriends.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {mockFriends.map((friend, index) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {friend.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                      friend.status === 'online' ? 'bg-success' : 'bg-muted-foreground'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{friend.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {friend.animesCount} animes
                    </p>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold mb-4">
              Atividade dos Amigos
            </h2>
            
            <div className="space-y-4">
              {mockActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {activity.user.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="text-primary font-medium">{activity.anime}</span>
                      {activity.rating && (
                        <span className="text-warning ml-1">
                          {'★'.repeat(activity.rating)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
