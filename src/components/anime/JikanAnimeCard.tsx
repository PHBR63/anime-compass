import React, { useState, useCallback } from 'react';
import { Plus, Star, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JikanAnime } from '@/hooks/useJikanApi';
import { useAnimeEntriesContext } from '@/contexts/AnimeEntriesContext';
import { AnimeDetailModal } from './AnimeDetailModal';
import { AnimeCardImage } from '@/components/ui/lazy-image';
import { toast } from 'sonner';

interface JikanAnimeCardProps {
  anime: JikanAnime;
  rank?: number;
}

/**
 * Componente de card para animes da API Jikan com modal de detalhes
 * Memoizado com lazy loading de imagens
 */
function JikanAnimeCardComponent({ anime, rank }: JikanAnimeCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  
  // Usa contexto compartilhado ao invés de hook individual
  const { isInList, addEntry } = useAnimeEntriesContext();
  
  // Verifica se o anime já está na lista do usuário
  const inList = isInList(anime.mal_id);

  // Função para adicionar anime à lista (memoizada)
  const handleAddToList = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (inList) {
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
      },
      onError: () => {
        toast.error('Erro ao adicionar anime');
      }
    });
  }, [inList, addEntry, anime]);

  // Handler para abrir modal (memoizado)
  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  return (
    <>
      <div 
        className="anime-card group cursor-pointer animate-scale-in"
        onClick={handleOpenModal}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
          {/* Imagem do anime com lazy loading */}
          <AnimeCardImage
            src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
            alt={anime.title}
            showHoverEffect={true}
          />
          
          {/* Gradiente de overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
          
          {/* Badge de ranking */}
          {rank && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-bold">
              #{rank}
            </div>
          )}
          
          {/* Badge de nota */}
          {anime.score && (
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
              <Star className="h-3 w-3 text-warning fill-warning" />
              {anime.score.toFixed(1)}
            </div>
          )}

          {/* Botão de adicionar (aparece no hover) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="sm"
              variant={inList ? "secondary" : "default"}
              className="gap-1"
              onClick={handleAddToList}
              disabled={addEntry.isPending}
            >
              {addEntry.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : inList ? (
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
          
          {/* Informações do anime */}
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

      {/* Modal de detalhes */}
      <AnimeDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        jikanAnime={anime}
      />
    </>
  );
}

// Exporta componente memoizado para evitar re-renders
export const JikanAnimeCard = React.memo(JikanAnimeCardComponent, (prevProps, nextProps) => {
  return prevProps.anime.mal_id === nextProps.anime.mal_id && prevProps.rank === nextProps.rank;
});
