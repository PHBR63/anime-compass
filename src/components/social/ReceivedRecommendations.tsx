import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useReceivedRecommendations, 
  useRespondToRecommendation 
} from '@/hooks/useAnimeRecommendations';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';
import { Gift, Check, Eye, Clock, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Componente para exibir recomendações recebidas
 * Permite que o usuário veja detalhes do anime e adicione à lista
 */
export function ReceivedRecommendations() {
  const { data: recommendations, isLoading } = useReceivedRecommendations();
  const respondToRecommendation = useRespondToRecommendation();
  const [selectedMalId, setSelectedMalId] = useState<number | null>(null);

  const pendingRecommendations = recommendations?.filter(r => r.status === 'pending') || [];
  const acceptedRecommendations = recommendations?.filter(r => r.status === 'accepted') || [];

  // Função auxiliar para pegar as iniciais do nome
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Indicações Recebidas
            {pendingRecommendations.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {pendingRecommendations.length} novas
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pendentes */}
          {pendingRecommendations.map(rec => (
            <div 
              key={rec.id}
              className="flex gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3"
            >
              {/* Imagem clicável para abrir modal com tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedMalId(rec.mal_id)}
                      className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img 
                        src={rec.anime_image || '/placeholder.svg'}
                        alt={rec.anime_title}
                        className="h-20 w-14 rounded object-cover"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clique para ver detalhes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {/* Título clicável para abrir modal com tooltip */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setSelectedMalId(rec.mal_id)}
                            className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors text-left"
                          >
                            {rec.anime_title}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clique para ver detalhes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={rec.from_user?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(rec.from_user?.display_name || rec.from_user?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {rec.from_user?.display_name || rec.from_user?.username}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    Nova
                  </Badge>
                </div>
                
                {rec.message && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 line-clamp-2">
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    "{rec.message}"
                  </p>
                )}

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => respondToRecommendation.mutate({ id: rec.id, status: 'accepted' })}
                    disabled={respondToRecommendation.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aceitar
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => respondToRecommendation.mutate({ id: rec.id, status: 'watched' })}
                    disabled={respondToRecommendation.isPending}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Já Assisti
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Aceitas (aguardando assistir) */}
          {acceptedRecommendations.slice(0, 3).map(rec => (
            <div 
              key={rec.id}
              className="flex gap-3 rounded-lg bg-muted/30 p-3"
            >
              {/* Imagem clicável para abrir modal com tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedMalId(rec.mal_id)}
                      className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img 
                        src={rec.anime_image || '/placeholder.svg'}
                        alt={rec.anime_title}
                        className="h-16 w-12 rounded object-cover"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clique para ver detalhes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1 min-w-0">
                {/* Título clicável para abrir modal com tooltip */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSelectedMalId(rec.mal_id)}
                        className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors text-left"
                      >
                        {rec.anime_title}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clique para ver detalhes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">
                  Indicado por {rec.from_user?.display_name || rec.from_user?.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="self-center"
                onClick={() => respondToRecommendation.mutate({ id: rec.id, status: 'watched' })}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal de detalhes do anime */}
      <AnimeDetailModal
        open={!!selectedMalId}
        onOpenChange={(open) => !open && setSelectedMalId(null)}
        malId={selectedMalId || 0}
      />
    </>
  );
}
