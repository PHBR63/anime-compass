import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, Film } from 'lucide-react';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useSearchAnimes } from '@/hooks/useJikanApi';
import { LazyImage } from '@/components/ui/lazy-image';

interface SelectAnimeForChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (anime: any, message?: string) => void;
  mode: 'card' | 'recommendation';
  recipientId?: string;
}

// Modal para selecionar anime para compartilhar no chat
export default function SelectAnimeForChat({
  open,
  onOpenChange,
  onSelect,
  mode,
  recipientId,
}: SelectAnimeForChatProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [myListFilter, setMyListFilter] = useState(''); // Filtro para "Minha Lista"
  const [selectedAnime, setSelectedAnime] = useState<any>(null);
  const [recommendationMessage, setRecommendationMessage] = useState('');
  
  const { data: entries } = useAnimeEntries();
  const { data: searchResults, isLoading: isSearching } = useSearchAnimes(searchQuery);

  // Animes da lista do usuário
  const myAnimes = entries?.map(entry => ({
    mal_id: entry.mal_id,
    title: entry.title,
    image_url: entry.image_url,
    episodes: entry.total_episodes,
    score: entry.rating,
  })) || [];

  // Filtrar animes da lista pelo termo de busca
  const filteredMyAnimes = myAnimes.filter(anime =>
    anime.title.toLowerCase().includes(myListFilter.toLowerCase())
  );

  // Resetar ao fechar
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedAnime(null);
      setRecommendationMessage('');
      setSearchQuery('');
      setMyListFilter(''); // Resetar filtro da lista
    }
    onOpenChange(open);
  };

  // Selecionar anime
  const handleSelectAnime = (anime: any) => {
    if (mode === 'recommendation') {
      setSelectedAnime(anime);
    } else {
      onSelect(anime);
    }
  };

  // Confirmar indicação
  const handleConfirmRecommendation = () => {
    if (selectedAnime) {
      onSelect(selectedAnime, recommendationMessage);
    }
  };

  // Renderizar card de anime
  const renderAnimeCard = (anime: any) => (
    <button
      key={anime.mal_id}
      onClick={() => handleSelectAnime(anime)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
    >
      <LazyImage
        src={anime.image_url || anime.images?.jpg?.image_url}
        alt={anime.title}
        className="w-12 h-16 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{anime.title}</p>
        <p className="text-xs text-muted-foreground">
          {anime.episodes || anime.total_episodes || '?'} episódios
        </p>
        {(anime.score || anime.rating) && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span>{anime.score || anime.rating}</span>
          </div>
        )}
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'card' ? (
              <>
                <Film className="h-5 w-5" />
                Compartilhar Anime
              </>
            ) : (
              <>
                <Star className="h-5 w-5" />
                Indicar Anime
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Se modo indicação e anime já selecionado */}
        {mode === 'recommendation' && selectedAnime ? (
          <div className="space-y-4">
            {/* Preview do anime selecionado */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <LazyImage
                src={selectedAnime.image_url || selectedAnime.images?.jpg?.image_url}
                alt={selectedAnime.title}
                className="w-16 h-20 object-cover rounded"
              />
              <div>
                <p className="font-medium">{selectedAnime.title}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAnime.episodes || '?'} episódios
                </p>
              </div>
            </div>

            {/* Mensagem personalizada */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Mensagem (opcional)
              </label>
              <Textarea
                placeholder="Por que você está indicando este anime?"
                value={recommendationMessage}
                onChange={(e) => setRecommendationMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setSelectedAnime(null)}
              >
                Voltar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleConfirmRecommendation}
              >
                Enviar Indicação
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="my-list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-list">Minha Lista</TabsTrigger>
              <TabsTrigger value="search">Buscar</TabsTrigger>
            </TabsList>

            {/* Aba: Minha Lista */}
            <TabsContent value="my-list">
              {/* Campo de busca na lista */}
              {myAnimes.length > 0 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar minha lista..."
                    value={myListFilter}
                    onChange={(e) => setMyListFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              
              <ScrollArea className="h-[260px]">
                {myAnimes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Você ainda não tem animes na sua lista
                  </div>
                ) : filteredMyAnimes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum anime encontrado
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredMyAnimes.map(renderAnimeCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Aba: Buscar */}
            <TabsContent value="search">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[250px]">
                  {isSearching ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Buscando...
                    </div>
                  ) : searchQuery.length < 3 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Digite pelo menos 3 caracteres
                    </div>
                  ) : searchResults?.data?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum anime encontrado
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults?.data?.map((anime: any) => renderAnimeCard({
                        mal_id: anime.mal_id,
                        title: anime.title,
                        image_url: anime.images?.jpg?.image_url,
                        episodes: anime.episodes,
                        score: anime.score,
                      }))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
