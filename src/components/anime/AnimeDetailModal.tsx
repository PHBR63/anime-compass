import { useState, useRef, forwardRef, useEffect } from 'react';
import { X, Plus, Minus, Calendar, Clock, Tv, Star, Heart, Loader2, Check, Bookmark, Languages, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { ReviewsList } from './ReviewsList';
import { ProgressHistory } from './ProgressHistory';
import { useAnimeEntries, useAddAnimeEntry, useUpdateAnimeEntry } from '@/hooks/useAnimeEntries';
import { useAddProgressHistory } from '@/hooks/useProgressHistory';
import { JikanAnime, useAnimeDetails } from '@/hooks/useJikanApi';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

// Placeholder para imagens que falham ao carregar
const PLACEHOLDER_IMAGE = '/placeholder.svg';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

// Tipo do catálogo local (importação inline para evitar dependência circular)
interface CatalogAnimeBasic {
  mal_id: number;
  title: string;
  title_english?: string | null;
  synopsis?: string | null;
  synopsis_pt?: string | null;
  image_url?: string | null;
  local_image_url?: string | null;
  score?: number | null;
  episodes?: number | null;
  year?: number | null;
  genres?: { mal_id: number; name: string }[];
  studios?: { mal_id: number; name: string }[];
  type?: string | null;
  rating?: string | null;
}

interface AnimeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Para animes da API Jikan
  jikanAnime?: JikanAnime;
  // Para animes do catálogo local
  catalogAnime?: CatalogAnimeBasic;
  malId?: number;
  // Para animes já na lista do usuário
  userEntry?: AnimeEntry;
}

const statusOptions: { value: AnimeStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Planejado', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'watching', label: 'Assistindo', color: 'bg-primary/20 text-primary border-primary/30' },
  { value: 'completed', label: 'Completo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'paused', label: 'Pausado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'dropped', label: 'Abandonado', color: 'bg-destructive/20 text-destructive border-destructive/30' },
];

// Modal de detalhes do anime com informações completas e avaliação
// Usa forwardRef para evitar warnings do React com refs em Dialog
export const AnimeDetailModal = forwardRef<HTMLDivElement, AnimeDetailModalProps>(
  function AnimeDetailModal({ open, onOpenChange, jikanAnime, catalogAnime, malId, userEntry }, ref) {
  // Só busca detalhes se não tiver dados locais ou da jikan
  const shouldFetchDetails = malId && !jikanAnime && !catalogAnime;
  const { data: animeDetails, isLoading: loadingDetails } = useAnimeDetails(shouldFetchDetails ? malId : 0);
  const { data: userEntries } = useAnimeEntries();
  const addEntry = useAddAnimeEntry();
  const updateEntry = useUpdateAnimeEntry();
  const addProgressHistory = useAddProgressHistory();
  
  // Ref para rastrear episódios antes da mudança
  const previousEpisodesRef = useRef<number | null>(null);

  // Determina o anime a ser exibido (prioridade: jikan > catalog > fetch)
  const anime = jikanAnime || animeDetails?.data;
  
  // Dados do catálogo local (se disponível)
  const catalogData = catalogAnime;
  
  // Dados combinados - PRIORIZA userEntry para preservar dados do usuário
  // Ordem de prioridade: userEntry > catalogData > anime (Jikan API)
  const displayData = {
    mal_id: userEntry?.mal_id || catalogData?.mal_id || anime?.mal_id,
    title: userEntry?.title || catalogData?.title || anime?.title || '',
    synopsis: catalogData?.synopsis_pt || catalogData?.synopsis || anime?.synopsis,
    // Imagem: prioriza userEntry (dados já salvos do usuário)
    image_url: userEntry?.image_url || catalogData?.local_image_url || catalogData?.image_url || anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url,
    score: catalogData?.score || anime?.score,
    // Episódios: prioriza userEntry.total_episodes (dados já salvos)
    episodes: userEntry?.total_episodes || catalogData?.episodes || anime?.episodes,
    year: catalogData?.year || anime?.year,
    genres: catalogData?.genres || anime?.genres || [],
    studios: catalogData?.studios || anime?.studios || [],
    type: catalogData?.type || anime?.type,
    rating: catalogData?.rating || anime?.rating,
  };

  // Se tem synopsis_pt do catálogo, não precisa traduzir
  const hasCatalogTranslation = !!catalogData?.synopsis_pt;

  // Tradução da sinopse para PT-BR (apenas se não tiver tradução do catálogo)
  const { data: translatedSynopsis, isLoading: loadingTranslation } = useTranslation(
    open && !hasCatalogTranslation && displayData.synopsis ? displayData.synopsis : null
  );
  
  // Sinopse final (prioriza catálogo > tradução > original)
  const finalSynopsis = catalogData?.synopsis_pt || translatedSynopsis || displayData.synopsis;
  
  // Verifica se já está na lista
  const existingEntry = userEntries?.find(e => e.mal_id === (displayData.mal_id || userEntry?.mal_id));
  const entry = userEntry || existingEntry;

  // Estados locais para edição
  const [localRating, setLocalRating] = useState<number>(entry?.rating ? Number(entry.rating) : 0);
  const [localNotes, setLocalNotes] = useState<string>(entry?.notes || '');
  const [localNotesHasSpoilers, setLocalNotesHasSpoilers] = useState<boolean>(entry?.notes_has_spoilers || false);
  const [localEpisodes, setLocalEpisodes] = useState<number>(entry?.episodes_watched || 0);
  const [localStatus, setLocalStatus] = useState<AnimeStatus>(entry?.status || 'not_started');

  // Atualiza estados quando entry muda
  useEffect(() => {
    if (entry) {
      setLocalRating(entry.rating ? Number(entry.rating) : 0);
      setLocalNotes(entry.notes || '');
      setLocalNotesHasSpoilers(entry.notes_has_spoilers || false);
      setLocalEpisodes(entry.episodes_watched || 0);
      setLocalStatus(entry.status);
    }
  }, [entry]);

  // Função para adicionar à lista (usa displayData para suportar catálogo e jikan)
  const handleAddToList = () => {
    if (!displayData.mal_id) return;

    addEntry.mutate({
      mal_id: displayData.mal_id,
      title: displayData.title,
      image_url: displayData.image_url,
      total_episodes: displayData.episodes,
      status: 'not_started',
    }, {
      onSuccess: () => {
        toast.success(`${displayData.title} adicionado à sua lista!`);
      },
    });
  };

  // Função para atualizar entrada
  const handleUpdate = (updates: Partial<AnimeEntry>) => {
    if (!entry) return;
    updateEntry.mutate({ id: entry.id, ...updates });
  };

  // Função para atualizar avaliação
  const handleRatingChange = (rating: number) => {
    setLocalRating(rating);
    if (entry) {
      handleUpdate({ rating: rating || null });
      toast.success(rating ? `Avaliação atualizada: ${rating} estrelas` : 'Avaliação removida');
    }
  };

  // Função para atualizar episódios com histórico
  const handleEpisodesChange = (delta: number) => {
    const totalEps = displayData.episodes || entry?.total_episodes || 999;
    const oldValue = localEpisodes;
    const newValue = Math.max(0, Math.min(totalEps, localEpisodes + delta));
    setLocalEpisodes(newValue);
    if (entry && oldValue !== newValue) {
      // Registrar no histórico
      addProgressHistory.mutate({
        anime_entry_id: entry.id,
        episodes_from: oldValue,
        episodes_to: newValue,
      });
      handleUpdate({ 
        episodes_watched: newValue,
        ...(newValue === totalEps && { status: 'completed' as AnimeStatus, completed_at: new Date().toISOString().split('T')[0] })
      });
    }
  };

  // Função para atualizar episódios via slider com histórico
  const handleSliderCommit = (newValue: number) => {
    if (!entry) return;
    const oldValue = previousEpisodesRef.current ?? entry.episodes_watched ?? 0;
    
    if (oldValue !== newValue) {
      // Registrar no histórico
      addProgressHistory.mutate({
        anime_entry_id: entry.id,
        episodes_from: oldValue,
        episodes_to: newValue,
      });
      
      const totalEps = displayData.episodes || entry?.total_episodes || 999;
      handleUpdate({ 
        episodes_watched: newValue,
        ...(newValue === totalEps && { 
          status: 'completed' as AnimeStatus, 
          completed_at: new Date().toISOString().split('T')[0] 
        })
      });
    }
    previousEpisodesRef.current = null;
  };

  // Função para atualizar status - auto-completa episódios se marcado como completo
  const handleStatusChange = (status: AnimeStatus) => {
    setLocalStatus(status);
    if (entry) {
      const totalEps = displayData.episodes || entry?.total_episodes;
      const isCompletingAnime = status === 'completed';
      
      // Se marcando como completo, define todos os episódios como assistidos
      if (isCompletingAnime && totalEps && localEpisodes < totalEps) {
        const oldValue = localEpisodes;
        setLocalEpisodes(totalEps);
        addProgressHistory.mutate({
          anime_entry_id: entry.id,
          episodes_from: oldValue,
          episodes_to: totalEps,
        });
        handleUpdate({ 
          status,
          episodes_watched: totalEps,
          completed_at: new Date().toISOString().split('T')[0]
        });
      } else {
        handleUpdate({ 
          status,
          ...(isCompletingAnime && { completed_at: new Date().toISOString().split('T')[0] })
        });
      }
    }
  };

  // Função para salvar notas
  const handleSaveNotes = () => {
    if (entry) {
      handleUpdate({ notes: localNotes, notes_has_spoilers: localNotesHasSpoilers });
      toast.success('Notas salvas!');
    }
  };

  if (!displayData.mal_id && !userEntry && !loadingDetails) {
    return null;
  }

  const totalEpisodes = displayData.episodes || entry?.total_episodes;
  
  // PRIORIDADE DE IMAGEM: entry (dados do usuário) > displayData (catálogo/jikan)
  // Isso garante que animes já salvos na lista do usuário sempre mostram suas imagens
  const imageUrl = entry?.image_url || displayData.image_url || PLACEHOLDER_IMAGE;
  
  // PRIORIDADE DE TÍTULO: entry (dados do usuário) > displayData (catálogo/jikan)
  const title = entry?.title || displayData.title || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Modal responsiva com scroll interno */}
      <DialogContent className="w-[95vw] max-w-3xl h-[90vh] max-h-[800px] overflow-y-auto glass-card border-border/50 p-0" showBeams={false} hideCloseButton={true}>
        {loadingDetails ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Header com imagem de fundo */}
            <div className="relative h-36 md:h-64 overflow-hidden">
              <img
                src={imageUrl || PLACEHOLDER_IMAGE}
                alt={title}
                className="w-full h-full object-cover opacity-30 blur-sm"
                onError={(e) => {
                  // Fallback para placeholder se imagem falhar
                  e.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
              
              {/* Botão de fechar */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors touch-manipulation"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
              </button>

              {/* Imagem e título */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex gap-3 md:gap-6">
                <img
                  src={imageUrl || PLACEHOLDER_IMAGE}
                  alt={title}
                  className="w-20 md:w-32 h-28 md:h-48 object-cover rounded-lg md:rounded-xl shadow-2xl border border-border/50 -mb-10 md:-mb-12 shrink-0"
                  onError={(e) => {
                    // Fallback para placeholder se imagem falhar
                    e.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
                <div className="flex-1 min-w-0 pb-1 md:pb-2">
                  <DialogHeader>
                    <DialogTitle className="text-base md:text-2xl font-display font-bold line-clamp-2 leading-tight">
                      {title}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Info rápida */}
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1.5 md:mt-2 text-xs md:text-sm text-muted-foreground">
                    {displayData.year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                        {displayData.year}
                      </span>
                    )}
                    {totalEpisodes && (
                      <span className="flex items-center gap-1">
                        <Tv className="h-3 w-3 md:h-4 md:w-4" />
                        {totalEpisodes} eps
                      </span>
                    )}
                    {displayData.score && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 md:h-4 md:w-4 text-warning fill-warning" />
                        {displayData.score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 md:p-6 pt-12 md:pt-16 space-y-4 md:space-y-6">
              {/* Gêneros */}
              {displayData.genres && displayData.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {displayData.genres.map((genre) => (
                    <Badge key={genre.mal_id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Ações - Adicionar ou Gerenciar */}
              {!entry ? (
                <Button onClick={handleAddToList} disabled={addEntry.isPending} className="w-full">
                  {addEntry.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bookmark className="h-4 w-4 mr-2" />
                  )}
                  Adicionar à Minha Lista
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((option) => (
                        <Badge
                          key={option.value}
                          variant="outline"
                          className={cn(
                            "cursor-pointer transition-all",
                            localStatus === option.value ? option.color : "hover:bg-secondary"
                          )}
                          onClick={() => handleStatusChange(option.value)}
                        >
                          {localStatus === option.value && <Check className="h-3 w-3 mr-1" />}
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Progresso com Slider interativo */}
                  {totalEpisodes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-3 block">
                        Progresso
                      </label>
                      <div className="space-y-4">
                        {/* Controles numéricos */}
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => handleEpisodesChange(-1)}
                            disabled={localEpisodes <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex-1 text-center">
                            <span className="text-2xl font-bold text-primary">
                              {localEpisodes}
                            </span>
                            <span className="text-lg text-muted-foreground">
                              {' / '}{totalEpisodes}
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {Math.round((localEpisodes / totalEpisodes) * 100)}% completo
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => handleEpisodesChange(1)}
                            disabled={localEpisodes >= totalEpisodes}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Slider interativo */}
                        <div className="px-1">
                          <Slider
                            value={[localEpisodes]}
                            onValueChange={(value) => {
                              // Salvar valor anterior antes de começar a arrastar
                              if (previousEpisodesRef.current === null) {
                                previousEpisodesRef.current = localEpisodes;
                              }
                              setLocalEpisodes(value[0]);
                            }}
                            onValueCommit={(value) => handleSliderCommit(value[0])}
                            max={totalEpisodes}
                            min={0}
                            step={1}
                            className="cursor-pointer"
                          />
                        </div>

                        {/* Atalhos rápidos */}
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const oldValue = localEpisodes;
                              setLocalEpisodes(0);
                              if (entry && oldValue !== 0) {
                                addProgressHistory.mutate({
                                  anime_entry_id: entry.id,
                                  episodes_from: oldValue,
                                  episodes_to: 0,
                                });
                                handleUpdate({ episodes_watched: 0 });
                              }
                            }}
                          >
                            Resetar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const oldValue = localEpisodes;
                              const half = Math.floor(totalEpisodes / 2);
                              setLocalEpisodes(half);
                              if (entry && oldValue !== half) {
                                addProgressHistory.mutate({
                                  anime_entry_id: entry.id,
                                  episodes_from: oldValue,
                                  episodes_to: half,
                                });
                                handleUpdate({ episodes_watched: half });
                              }
                            }}
                          >
                            Metade
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-green-500 hover:text-green-400"
                            onClick={() => {
                              const oldValue = localEpisodes;
                              setLocalEpisodes(totalEpisodes);
                              if (entry && oldValue !== totalEpisodes) {
                                addProgressHistory.mutate({
                                  anime_entry_id: entry.id,
                                  episodes_from: oldValue,
                                  episodes_to: totalEpisodes,
                                });
                                handleUpdate({ 
                                  episodes_watched: totalEpisodes,
                                  status: 'completed' as AnimeStatus,
                                  completed_at: new Date().toISOString().split('T')[0]
                                });
                              }
                            }}
                          >
                            Completo
                          </Button>
                        </div>

                        {/* Histórico de progresso */}
                        <ProgressHistory 
                          animeEntryId={entry?.id} 
                          totalEpisodes={totalEpisodes}
                        />
                      </div>
                    </div>
                  )}

                  {/* Avaliação pessoal */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Minha Avaliação
                    </label>
                    <StarRating
                      rating={localRating}
                      onRatingChange={handleRatingChange}
                      size="lg"
                    />
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Notas Pessoais
                    </label>
                    <Textarea
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      placeholder="Adicione suas anotações sobre este anime..."
                      className="bg-secondary/50 border-border/50 min-h-[80px]"
                    />
                    
                    {/* Toggle de spoiler */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="notes-spoiler"
                          checked={localNotesHasSpoilers}
                          onCheckedChange={setLocalNotesHasSpoilers}
                        />
                        <Label 
                          htmlFor="notes-spoiler" 
                          className="text-sm cursor-pointer flex items-center gap-1.5"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                          Contém spoilers
                        </Label>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSaveNotes}
                      >
                        Salvar Notas
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sinopse traduzida */}
              {displayData.synopsis && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">Sinopse</h3>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Languages className="h-3 w-3" />
                      PT-BR
                    </Badge>
                  </div>
                  {loadingTranslation && !hasCatalogTranslation ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {finalSynopsis}
                    </p>
                  )}
                </div>
              )}

              {/* Informações adicionais */}
              {(displayData.type || displayData.studios?.length || displayData.rating) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {anime?.status && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium text-sm">{anime.status}</p>
                    </div>
                  )}
                  {displayData.type && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="font-medium text-sm">{displayData.type}</p>
                    </div>
                  )}
                  {displayData.studios && displayData.studios.length > 0 && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Estúdio</p>
                      <p className="font-medium text-sm">{displayData.studios[0].name}</p>
                    </div>
                  )}
                  {displayData.rating && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Classificação</p>
                      <p className="font-medium text-sm">{displayData.rating}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Seção de Reviews */}
              {displayData.mal_id && (
                <>
                  <Separator className="my-6" />
                  <ReviewsList malId={displayData.mal_id} animeTitle={displayData.title} />
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});

// Adiciona displayName para debugging
AnimeDetailModal.displayName = 'AnimeDetailModal';
