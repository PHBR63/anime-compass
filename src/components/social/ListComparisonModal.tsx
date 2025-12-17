import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useListComparison } from '@/hooks/useListComparison';
import { Star, Heart, Users, ArrowRight } from 'lucide-react';

interface ListComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string;
  friendName: string;
}

// Modal para comparar listas de animes entre usuários
export function ListComparisonModal({
  open,
  onOpenChange,
  friendId,
  friendName,
}: ListComparisonModalProps) {
  const { data: comparison, isLoading } = useListComparison(friendId);

  const getCompatibilityColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-blue-500';
    if (value >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getCompatibilityLabel = (value: number) => {
    if (value >= 80) return 'Muito compatíveis!';
    if (value >= 60) return 'Bem compatíveis';
    if (value >= 40) return 'Razoavelmente compatíveis';
    return 'Gostos diferentes';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Comparar Listas
          </DialogTitle>
          <DialogDescription>
            Veja o que você e {friendName} têm em comum
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : comparison ? (
          <div className="space-y-6">
            {/* Compatibilidade */}
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <div className="flex items-center justify-center gap-4 mb-3">
                <Heart className={`h-8 w-8 ${getCompatibilityColor(comparison.compatibility)}`} />
                <span className={`text-4xl font-bold ${getCompatibilityColor(comparison.compatibility)}`}>
                  {comparison.compatibility}%
                </span>
              </div>
              <p className="text-muted-foreground">
                {getCompatibilityLabel(comparison.compatibility)}
              </p>
              <Progress 
                value={comparison.compatibility} 
                className="mt-3 h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {comparison.totalCommon} animes em comum
              </p>
            </div>

            {/* Tabs de Comparação */}
            <Tabs defaultValue="common" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="common">
                  Em Comum ({comparison.commonAnimes.length})
                </TabsTrigger>
                <TabsTrigger value="only-me">
                  Só Eu ({comparison.onlyMe.length})
                </TabsTrigger>
                <TabsTrigger value="only-friend">
                  Só {friendName.split(' ')[0]} ({comparison.onlyFriend.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[300px] mt-4">
                {/* Animes em Comum */}
                <TabsContent value="common" className="space-y-2">
                  {comparison.commonAnimes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Vocês ainda não têm animes em comum
                    </p>
                  ) : (
                    comparison.commonAnimes.map(anime => (
                      <div 
                        key={anime.mal_id}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
                      >
                        <img 
                          src={anime.image_url || '/placeholder.svg'}
                          alt={anime.title}
                          className="h-12 w-9 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{anime.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {anime.myRating && (
                              <span className="flex items-center gap-1">
                                Você: 
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {anime.myRating}
                              </span>
                            )}
                            {anime.friendRating && (
                              <span className="flex items-center gap-1">
                                {friendName.split(' ')[0]}: 
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {anime.friendRating}
                              </span>
                            )}
                          </div>
                        </div>
                        {anime.myRating && anime.friendRating && (
                          <Badge 
                            variant={Math.abs(anime.myRating - anime.friendRating) <= 1 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {Math.abs(anime.myRating - anime.friendRating) <= 1 ? '💚' : '🤔'}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Só Eu Tenho */}
                <TabsContent value="only-me" className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Animes que você pode indicar para {friendName}
                  </p>
                  {comparison.onlyMe.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {friendName} tem todos os seus animes!
                    </p>
                  ) : (
                    comparison.onlyMe.map(anime => (
                      <div 
                        key={anime.mal_id}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
                      >
                        <img 
                          src={anime.image_url || '/placeholder.svg'}
                          alt={anime.title}
                          className="h-12 w-9 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{anime.title}</p>
                          <div className="flex items-center gap-2">
                            {anime.rating && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {anime.rating}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {anime.status === 'completed' ? 'Completo' : 
                               anime.status === 'watching' ? 'Assistindo' : 
                               anime.status === 'plan_to_watch' ? 'Planejado' : 
                               anime.status === 'on_hold' ? 'Pausado' : 'Dropado'}
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Só o Amigo Tem */}
                <TabsContent value="only-friend" className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Animes que {friendName} pode te indicar
                  </p>
                  {comparison.onlyFriend.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Você tem todos os animes de {friendName}!
                    </p>
                  ) : (
                    comparison.onlyFriend.map(anime => (
                      <div 
                        key={anime.mal_id}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
                      >
                        <img 
                          src={anime.image_url || '/placeholder.svg'}
                          alt={anime.title}
                          className="h-12 w-9 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{anime.title}</p>
                          <div className="flex items-center gap-2">
                            {anime.rating && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {anime.rating}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {anime.status === 'completed' ? 'Completo' : 
                               anime.status === 'watching' ? 'Assistindo' : 
                               anime.status === 'plan_to_watch' ? 'Planejado' : 
                               anime.status === 'on_hold' ? 'Pausado' : 'Dropado'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Não foi possível carregar a comparação
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
