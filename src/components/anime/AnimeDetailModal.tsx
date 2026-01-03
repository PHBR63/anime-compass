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
import { DataSourceBadge, type DataSource } from './DataSourceBadge';
import { useAnimeEntries, useAddAnimeEntry, useUpdateAnimeEntry } from '@/hooks/useAnimeEntries';
import { useAddProgressHistory } from '@/hooks/useProgressHistory';
import { useAnimeWithFallback } from '@/hooks/useAnimeWithFallback';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { CatalogAnime } from '@/types/catalog';

// Placeholder para imagens que falham ao carregar
const PLACEHOLDER_IMAGE = '/placeholder.svg';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

interface AnimeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Para animes do catálogo
  catalogAnime?: CatalogAnime;
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

/**
 * Modal de detalhes do anime com informações completas e avaliação
 * Usa a nova API de catálogo com fallback para Jikan
 */
export const AnimeDetailModal = forwardRef<HTMLDivElement, AnimeDetailModalProps>(
  function AnimeDetailModal({ open, onOpenChange, catalogAnime, malId, userEntry }, ref) {
  // Busca detalhes com fallback para Jikan se não estiver no catálogo
  const shouldFetchDetails = malId && !catalogAnime;
  const { anime: fetchedAnime, source: dataSource, isLoading: loadingDetails } = useAnimeWithFallback(shouldFetchDetails ? malId : null);
  const { data: userEntries } = useAnimeEntries();
  const addEntry = useAddAnimeEntry();
  const updateEntry = useUpdateAnimeEntry();
  const addProgressHistory = useAddProgressHistory();
  
  // Ref para rastrear episódios antes da mudança
  const previousEpisodesRef = useRef<number | null>(null);

  // Dados do catálogo (passado ou buscado)
  const catalogData = catalogAnime || fetchedAnime;
  
  // Dados combinados - PRIORIZA userEntry para preservar dados do usuário
  const displayData = {
    mal_id: userEntry?.mal_id || catalogData?.mal_id,
    title: userEntry?.title || catalogData?.title_english || catalogData?.title || '',
    synopsis: catalogData?.synopsis_pt || catalogData?.synopsis,
    // Imagem: prioriza userEntry > local_image_url > image_url
    image_url: userEntry?.image_url || catalogData?.local_image_url || catalogData?.image_url,
    score: catalogData?.score,
    // Episódios: prioriza userEntry.total_episodes
    episodes: userEntry?.total_episodes || catalogData?.episodes,
    year: catalogData?.year,
    genres: catalogData?.genres || [],
    studios: catalogData?.studios || [],
    type: catalogData?.type,
    rating: catalogData?.rating,
  };

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

  // Função para adicionar à lista
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

  // Função para atualizar status
  const handleStatusChange = (status: AnimeStatus) => {
    setLocalStatus(status);
    if (entry) {
      const totalEps = displayData.episodes || entry?.total_episodes;
      const isCompletingAnime = status === 'completed';
      
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
  const imageUrl = entry?.image_url || displayData.image_url || PLACEHOLDER_IMAGE;
  const title = entry?.title || displayData.title || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                    e.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
                <div className="flex-1 min-w-0 pb-1 md:pb-2">
                  <DialogHeader>
                    <div className="flex items-start gap-2">
                      <DialogTitle className="text-base md:text-2xl font-display font-bold line-clamp-2 leading-tight flex-1">
                        {title}
                      </DialogTitle>
                      {/* Indicador de fonte dos dados */}
                      <DataSourceBadge 
                        source={catalogAnime ? 'catalog' : dataSource} 
                        className="shrink-0 mt-1"
                      />
                    </div>
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
                  {displayData.genres.map((genre: { mal_id: number; name: string }) => (
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
                        
                        {/* Slider */}
                        <Slider
                          value={[localEpisodes]}
                          min={0}
                          max={totalEpisodes}
                          step={1}
                          onValueChange={([value]) => {
                            if (previousEpisodesRef.current === null) {
                              previousEpisodesRef.current = localEpisodes;
                            }
                            setLocalEpisodes(value);
                          }}
                          onValueCommit={([value]) => handleSliderCommit(value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Avaliação */}
                  <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Sua Avaliação
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
                      placeholder="Suas anotações sobre este anime..."
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="spoilers"
                          checked={localNotesHasSpoilers}
                          onCheckedChange={setLocalNotesHasSpoilers}
                        />
                        <Label htmlFor="spoilers" className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Contém spoilers
                        </Label>
                      </div>
                      <Button size="sm" onClick={handleSaveNotes}>
                        Salvar Notas
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Sinopse */}
              {displayData.synopsis && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Sinopse</h3>
                  <p className="text-sm leading-relaxed">{displayData.synopsis}</p>
                </div>
              )}

              {/* Histórico de progresso */}
              {entry && totalEpisodes && (
                <>
                  <Separator />
                  <ProgressHistory animeEntryId={entry.id} totalEpisodes={totalEpisodes} />
                </>
              )}

              {/* Reviews */}
              {displayData.mal_id && (
                <>
                  <Separator />
                  <ReviewsList malId={displayData.mal_id} animeTitle={title} />
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
