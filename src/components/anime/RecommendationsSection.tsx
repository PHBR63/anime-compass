import { useState } from 'react';
import { Sparkles, Star, Plus, Check, Loader2, RefreshCw, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecommendations, RecommendedAnime } from '@/hooks/useRecommendations';
import { useAddAnimeEntry, useAnimeEntries } from '@/hooks/useAnimeEntries';
import { AnimeDetailModal } from './AnimeDetailModal';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

// Seção de recomendações personalizadas baseadas nos gêneros do usuário
export function RecommendationsSection() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = useRecommendations();
  const { data: userEntries } = useAnimeEntries();
  const addEntry = useAddAnimeEntry();
  const [selectedAnime, setSelectedAnime] = useState<RecommendedAnime | null>(null);

  // Verifica se anime já está na lista
  const isInList = (malId: number) => userEntries?.some(e => e.mal_id === malId);

  // Adiciona anime à lista
  const handleAddToList = (anime: RecommendedAnime, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isInList(anime.mal_id)) {
      toast.info('Este anime já está na sua lista!');
      return;
    }

    addEntry.mutate({
      mal_id: anime.mal_id,
      title: anime.title,
      image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      total_episodes: anime.episodes,
      status: 'not_started',
    }, {
      onSuccess: () => {
        toast.success(`${anime.title} adicionado à sua lista!`);
        // Invalidar recomendações após adicionar
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      },
    });
  };

  // Atualiza recomendações
  const handleRefresh = () => {
    refetch();
    toast.info('Atualizando recomendações...');
  };

  // Verifica se é erro de sessão expirada
  const isSessionError = error?.message?.includes('Sessão expirada') || 
                         error?.message?.includes('login novamente') ||
                         error?.message?.includes('401');

  // Exibe card de sessão expirada
  if (error && isSessionError) {
    return (
      <section className="glass-card p-4 md:p-6 rounded-xl border border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-warning" />
          <h2 className="font-display text-lg md:text-xl font-semibold">Recomendações Para Você</h2>
        </div>
        <div className="flex flex-col items-center gap-4 py-6 md:py-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm md:text-base mb-2">
              Sua sessão expirou. Faça login novamente para ver suas recomendações personalizadas.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/auth')}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Fazer login novamente
          </Button>
        </div>
      </section>
    );
  }

  // Para outros erros, não exibe a seção
  if (error) {
    return null;
  }

  // Se não tem recomendações e não está carregando
  if (!isLoading && (!data?.recommendations || data.recommendations.length === 0)) {
    return (
      <section className="glass-card p-4 md:p-6 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-warning" />
          <h2 className="font-display text-lg md:text-xl font-semibold">Recomendações Para Você</h2>
        </div>
        <p className="text-muted-foreground text-center text-sm md:text-base py-6 md:py-8">
          {data?.message || 'Adicione mais animes à sua lista para receber recomendações personalizadas!'}
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-warning" />
          <h2 className="font-display text-lg md:text-xl font-semibold">Recomendações Para Você</h2>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {data?.topGenres && data.topGenres.length > 0 && (
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto">
              <span className="text-xs text-muted-foreground shrink-0">Baseado em:</span>
              {data.topGenres.slice(0, 3).map((genre) => (
                <Badge key={genre.id} variant="outline" className="text-xs shrink-0">
                  {genre.name}
                </Badge>
              ))}
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {data?.recommendations.map((anime) => (
            <div 
              key={anime.mal_id} 
              className="anime-card group cursor-pointer"
              onClick={() => setSelectedAnime(anime)}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                <img
                  src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  alt={anime.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                
                {/* Badge de recomendação */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs bg-warning/20 text-warning border-warning/30">
                    {anime.recommendedBecause}
                  </Badge>
                </div>
                
                {/* Nota */}
                {anime.score && (
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <Star className="h-3 w-3 text-warning fill-warning" />
                    {anime.score.toFixed(1)}
                  </div>
                )}

                {/* Botão de adicionar */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    size="sm"
                    variant={isInList(anime.mal_id) ? "secondary" : "default"}
                    className="gap-1"
                    onClick={(e) => handleAddToList(anime, e)}
                    disabled={addEntry.isPending}
                  >
                    {addEntry.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isInList(anime.mal_id) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Na Lista
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-medium text-sm line-clamp-2 text-foreground">
                    {anime.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {anime.episodes ? `${anime.episodes} eps` : '? eps'} • {anime.year || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedAnime && (
        <AnimeDetailModal
          open={!!selectedAnime}
          onOpenChange={(open) => !open && setSelectedAnime(null)}
          jikanAnime={selectedAnime}
        />
      )}
    </section>
  );
}
