import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePublicProfileById } from '@/hooks/usePublicProfile';
import { useFriendAnimeCount } from '@/hooks/useFriendships';
import { useCreateConversation } from '@/hooks/useConversations';
import { 
  User, 
  Tv, 
  Star, 
  Trophy, 
  List, 
  GitCompare,
  ExternalLink,
  Heart,
  Play,
  CheckCircle2,
  MessageCircle
} from 'lucide-react';
import { ListComparisonModal } from './ListComparisonModal';
import { RecommendAnimeModal } from './RecommendAnimeModal';
import { toast } from 'sonner';

interface FriendProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string;
  friendName: string;
}

// Drawer para visualizar perfil de um amigo
export function FriendProfileDrawer({ 
  open, 
  onOpenChange, 
  friendId,
  friendName 
}: FriendProfileDrawerProps) {
  const navigate = useNavigate();
  const { data: profileData, isLoading } = usePublicProfileById(friendId);
  const { data: animeCount } = useFriendAnimeCount(friendId);
  const [showComparison, setShowComparison] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
  const createConversation = useCreateConversation();

  // Iniciar conversa com amigo
  const handleStartChat = async () => {
    try {
      const conversation = await createConversation.mutateAsync({
        type: 'direct',
        participantIds: [friendId],
      });
      
      onOpenChange(false);
      navigate(`/chat?conversation=${conversation.id}`);
    } catch (error) {
      toast.error('Erro ao iniciar conversa');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const rarityColors: Record<string, string> = {
    common: 'bg-muted text-muted-foreground',
    uncommon: 'bg-green-500/20 text-green-500',
    rare: 'bg-blue-500/20 text-blue-500',
    epic: 'bg-purple-500/20 text-purple-500',
    legendary: 'bg-amber-500/20 text-amber-500',
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <ScrollArea className="h-full max-h-[85vh]">
            <div className="mx-auto w-full max-w-2xl px-4 pb-8">
              <DrawerHeader className="text-center">
                <DrawerTitle>Perfil do Amigo</DrawerTitle>
                <DrawerDescription>
                  Veja as estatísticas e conquistas
                </DrawerDescription>
              </DrawerHeader>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </div>
              ) : profileData ? (
                <div className="space-y-6">
                  {/* Avatar e Info */}
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={profileData.profile.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl">
                        {getInitials(profileData.profile.display_name || profileData.profile.username || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h3 className="text-xl font-bold">
                        {profileData.profile.display_name || profileData.profile.username}
                      </h3>
                      {profileData.profile.username && (
                        <p className="text-sm text-muted-foreground">
                          @{profileData.profile.username}
                        </p>
                      )}
                      {profileData.profile.bio && (
                        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                          {profileData.profile.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <Tv className="mx-auto h-5 w-5 text-primary mb-1" />
                      <p className="text-xl font-bold">{profileData.stats.totalAnimes}</p>
                      <p className="text-xs text-muted-foreground">Animes</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <CheckCircle2 className="mx-auto h-5 w-5 text-green-500 mb-1" />
                      <p className="text-xl font-bold">{profileData.stats.completedAnimes}</p>
                      <p className="text-xs text-muted-foreground">Completos</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <Star className="mx-auto h-5 w-5 text-amber-500 mb-1" />
                      <p className="text-xl font-bold">
                        {profileData.stats.averageRating.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Média</p>
                    </div>
                  </div>

                  {/* Ações Principais */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-col h-auto py-3"
                      onClick={() => setShowComparison(true)}
                    >
                      <GitCompare className="h-5 w-5 mb-1" />
                      <span className="text-xs">Comparar</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-col h-auto py-3"
                      onClick={() => setShowRecommend(true)}
                    >
                      <Heart className="h-5 w-5 mb-1" />
                      <span className="text-xs">Indicar</span>
                    </Button>
                    <Button 
                      className="flex-col h-auto py-3"
                      onClick={handleStartChat}
                      disabled={createConversation.isPending}
                    >
                      <MessageCircle className="h-5 w-5 mb-1" />
                      <span className="text-xs">Mensagem</span>
                    </Button>
                  </div>

                  {/* Conquistas Recentes */}
                  {profileData.achievements.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Conquistas Recentes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profileData.achievements.slice(0, 6).map(achievement => (
                          <Badge 
                            key={achievement.id}
                            className={rarityColors[achievement.rarity || 'common']}
                          >
                            <span className="mr-1">{achievement.icon}</span>
                            {achievement.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Favoritos */}
                  {profileData.favorites.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        Favoritos
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {profileData.favorites.map(anime => (
                          <div 
                            key={anime.id}
                            className="group relative rounded-lg overflow-hidden aspect-[3/4]"
                          >
                            <img 
                              src={anime.image_url || '/placeholder.svg'}
                              alt={anime.title}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs font-medium text-white truncate">
                                {anime.title}
                              </p>
                              {anime.rating && (
                                <div className="flex items-center gap-1 text-amber-400">
                                  <Star className="h-3 w-3 fill-current" />
                                  <span className="text-xs">{anime.rating}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Listas Públicas */}
                  {profileData.publicLists.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <List className="h-4 w-4 text-blue-500" />
                        Listas Públicas
                      </h4>
                      <div className="space-y-2">
                        {profileData.publicLists.map(list => (
                          <div 
                            key={list.id}
                            className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                          >
                            <div>
                              <p className="font-medium">{list.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {list.item_count} animes
                              </p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ver Perfil Completo */}
                  {profileData.profile.username && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/u/${profileData.profile.username}`);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Ver Perfil Completo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="mx-auto h-12 w-12 opacity-50 mb-2" />
                  <p>Perfil não disponível</p>
                  <p className="text-sm">Este usuário pode ter o perfil privado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Modal de Comparação */}
      <ListComparisonModal
        open={showComparison}
        onOpenChange={setShowComparison}
        friendId={friendId}
        friendName={friendName}
      />

      {/* Modal de Recomendação */}
      <RecommendAnimeModal
        open={showRecommend}
        onOpenChange={setShowRecommend}
        friendId={friendId}
        friendName={friendName}
      />
    </>
  );
}
