import { useState } from 'react';
import { Sparkles, Star, RefreshCw, TrendingUp, Building2, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionExpiredCard, isSessionExpiredError } from '@/components/ui/SessionExpiredCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRecommendations, SmartRecommendation } from '@/hooks/useRecommendations';
import { useAddAnimeEntry, useAnimeEntries } from '@/hooks/useAnimeEntries';
import { SmartRecommendationCard } from './SmartRecommendationCard';
import { AnimeDetailModal } from './AnimeDetailModal';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Tipos de filtro para as recomendações
type FilterType = 'all' | 'high' | 'studio' | 'genre';

/**
 * Seção de recomendações inteligentes com análise de perfil e IA
 */
export function RecommendationsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useRecommendations();
  const { data: userEntries } = useAnimeEntries();
  const addEntry = useAddAnimeEntry();
  const [selectedAnime, setSelectedAnime] = useState<SmartRecommendation | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Verifica se anime já está na lista
  const isInList = (malId: number) => userEntries?.some(e => e.mal_id === malId);

  // Adiciona anime à lista
  const handleAddToList = (recommendation: SmartRecommendation, e: React.MouseEvent) => {
    e.stopPropagation();
    const anime = recommendation.anime;
    
    if (isInList(anime.mal_id)) {
      toast.info('Este anime já está na sua lista!');
      return;
    }

    addEntry.mutate({
      mal_id: anime.mal_id,
      title: anime.title,
      image_url: anime.local_image_url || anime.image_url,
      total_episodes: anime.episodes,
      status: 'not_started',
    }, {
      onSuccess: () => {
        toast.success(`${anime.title} adicionado à sua lista!`);
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      },
    });
  };

  // Atualiza recomendações
  const handleRefresh = () => {
    refetch();
    toast.info('Atualizando recomendações...');
  };

  // Filtra recomendações baseado no filtro selecionado
  const getFilteredRecommendations = (): SmartRecommendation[] => {
    if (!data?.recommendations) return [];
    
    switch (filter) {
      case 'high':
        return data.recommendations.filter(r => r.confidence === 'high');
      case 'studio':
        return data.recommendations.filter(r => r.reasons.studio !== null);
      case 'genre':
        return data.recommendations.filter(r => r.reasons.genres.length > 0);
      default:
        return data.recommendations;
    }
  };

  const filteredRecommendations = getFilteredRecommendations();

  // Exibe card de sessão expirada
  if (isSessionExpiredError(error)) {
    return (
      <SessionExpiredCard
        title="Recomendações Para Você"
        icon={<Sparkles className="h-4 w-4 md:h-5 md:w-5 text-warning" />}
        message="Sua sessão expirou. Faça login novamente para ver suas recomendações personalizadas."
      />
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
      {/* Header com estatísticas do usuário */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-warning" />
          <h2 className="font-display text-lg md:text-xl font-semibold">Recomendações Para Você</h2>
          {data?.userStats && (
            <Badge variant="outline" className="ml-2 text-xs hidden sm:flex">
              <TrendingUp className="h-3 w-3 mr-1" />
              {data.userStats.analyzedAnimes} animes analisados
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* Gêneros e estúdios favoritos */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto">
            {data?.topGenres && data.topGenres.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">Baseado em:</span>
                {data.topGenres.slice(0, 2).map((genre) => (
                  <Badge key={genre.id} variant="outline" className="text-xs shrink-0 bg-blue-500/10 text-blue-400 border-blue-500/30">
                    {genre.name}
                  </Badge>
                ))}
              </>
            )}
            {data?.topStudios && data.topStudios.length > 0 && (
              <Badge variant="outline" className="text-xs shrink-0 bg-purple-500/10 text-purple-400 border-purple-500/30">
                <Building2 className="h-3 w-3 mr-1" />
                {data.topStudios[0].name}
              </Badge>
            )}
          </div>
          
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

      {/* Filtros */}
      {!isLoading && data?.recommendations && data.recommendations.length > 0 && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mb-4">
          <TabsList className="h-8 bg-muted/50">
            <TabsTrigger value="all" className="text-xs h-7 px-3">
              <Filter className="h-3 w-3 mr-1" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="high" className="text-xs h-7 px-3">
              <Star className="h-3 w-3 mr-1 text-green-500" />
              Alta Compatibilidade
            </TabsTrigger>
            <TabsTrigger value="studio" className="text-xs h-7 px-3">
              <Building2 className="h-3 w-3 mr-1 text-purple-500" />
              Por Estúdio
            </TabsTrigger>
            <TabsTrigger value="genre" className="text-xs h-7 px-3">
              Gêneros
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Grid de recomendações */}
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
      ) : filteredRecommendations.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm py-8">
          Nenhuma recomendação encontrada com este filtro.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {filteredRecommendations.map((recommendation) => (
            <SmartRecommendationCard
              key={recommendation.anime.mal_id}
              recommendation={recommendation}
              isInList={isInList(recommendation.anime.mal_id) || false}
              isAdding={addEntry.isPending}
              onAdd={(e) => handleAddToList(recommendation, e)}
              onClick={() => setSelectedAnime(recommendation)}
            />
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedAnime && (
        <AnimeDetailModal
          open={!!selectedAnime}
          onOpenChange={(open) => !open && setSelectedAnime(null)}
          catalogAnime={selectedAnime.anime}
        />
      )}
    </section>
  );
}
