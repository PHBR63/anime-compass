import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useSendRecommendation } from '@/hooks/useAnimeRecommendations';
import { Search, Send, Star, CheckCircle2 } from 'lucide-react';

interface RecommendAnimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string;
  friendName: string;
}

/**
 * Modal para recomendar um anime a um amigo
 */
export function RecommendAnimeModal({
  open,
  onOpenChange,
  friendId,
  friendName,
}: RecommendAnimeModalProps) {
  const [search, setSearch] = useState('');
  const [selectedAnime, setSelectedAnime] = useState<{
    mal_id: number;
    title: string;
    image_url: string | null;
  } | null>(null);
  const [message, setMessage] = useState('');
  
  const { data: entries, isLoading } = useAnimeEntries();
  const sendRecommendation = useSendRecommendation();

  // Filtrar animes completados ou com boa avaliação
  const recommendableAnimes = entries
    ?.filter(e => e.status === 'completed' || (e.rating && Number(e.rating) >= 7))
    .filter(e => 
      search === '' || 
      e.title.toLowerCase().includes(search.toLowerCase())
    ) || [];

  // Enviar recomendação
  const handleSend = async () => {
    if (!selectedAnime) return;

    await sendRecommendation.mutateAsync({
      to_user_id: friendId,
      mal_id: selectedAnime.mal_id,
      anime_title: selectedAnime.title,
      anime_image: selectedAnime.image_url || undefined,
      message: message || undefined
    });

    // Limpar e fechar
    setSelectedAnime(null);
    setMessage('');
    setSearch('');
    onOpenChange(false);
  };

  // Fechar modal
  const handleClose = () => {
    setSelectedAnime(null);
    setMessage('');
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* Modal responsiva com altura adaptável */}
      <DialogContent className="w-[95vw] max-w-lg h-[85vh] max-h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Indicar Anime
          </DialogTitle>
          <DialogDescription>
            Recomende um anime da sua lista para {friendName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6">
          {!selectedAnime ? (
            <>
              {/* Busca */}
              <div className="relative mb-4 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na sua lista..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lista de Animes com scroll */}
              <ScrollArea className="flex-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
                {isLoading ? (
                  <div className="space-y-2 pb-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recommendableAnimes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {search ? 'Nenhum anime encontrado' : 'Complete alguns animes primeiro'}
                  </p>
                ) : (
                  <div className="space-y-2 pb-4">
                    {recommendableAnimes.map(anime => (
                      <button
                        key={anime.id}
                        onClick={() => setSelectedAnime({
                          mal_id: anime.mal_id,
                          title: anime.title,
                          image_url: anime.image_url
                        })}
                        className="flex items-center gap-3 w-full rounded-lg bg-muted/30 p-2 hover:bg-muted/50 transition-colors text-left"
                      >
                        <img 
                          src={anime.image_url || '/placeholder.svg'}
                          alt={anime.title}
                          className="h-12 w-9 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{anime.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {anime.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {anime.rating}
                              </span>
                            )}
                            {anime.status === 'completed' && (
                              <span className="flex items-center gap-1 text-green-500">
                                <CheckCircle2 className="h-3 w-3" />
                                Completo
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col pb-4">
              {/* Anime Selecionado */}
              <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3 mb-4 flex-shrink-0">
                <img 
                  src={selectedAnime.image_url || '/placeholder.svg'}
                  alt={selectedAnime.title}
                  className="h-16 w-12 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedAnime.title}</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-xs"
                    onClick={() => setSelectedAnime(null)}
                  >
                    Trocar anime
                  </Button>
                </div>
              </div>

              {/* Mensagem opcional */}
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">
                  Mensagem (opcional)
                </label>
                <Textarea
                  placeholder={`Por que você recomenda "${selectedAnime.title}" para ${friendName}?`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4 flex-shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedAnime(null)}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSend}
                  disabled={sendRecommendation.isPending}
                >
                  {sendRecommendation.isPending ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
