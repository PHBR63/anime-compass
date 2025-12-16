import { useState } from 'react';
import { X, Plus, Minus, Calendar, Clock, Tv, Star, Heart, Loader2, Check, Bookmark } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from './StarRating';
import { useAnimeEntries, useAddAnimeEntry, useUpdateAnimeEntry } from '@/hooks/useAnimeEntries';
import { JikanAnime, useAnimeDetails } from '@/hooks/useJikanApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeStatus = Database['public']['Enums']['anime_status'];

interface AnimeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Para animes da API Jikan
  jikanAnime?: JikanAnime;
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
export function AnimeDetailModal({ open, onOpenChange, jikanAnime, malId, userEntry }: AnimeDetailModalProps) {
  const { data: animeDetails, isLoading: loadingDetails } = useAnimeDetails(malId && !jikanAnime ? malId : 0);
  const { data: userEntries } = useAnimeEntries();
  const addEntry = useAddAnimeEntry();
  const updateEntry = useUpdateAnimeEntry();

  // Determina o anime a ser exibido
  const anime = jikanAnime || animeDetails?.data;
  
  // Verifica se já está na lista
  const existingEntry = userEntries?.find(e => e.mal_id === (anime?.mal_id || userEntry?.mal_id));
  const entry = userEntry || existingEntry;

  // Estados locais para edição
  const [localRating, setLocalRating] = useState<number>(entry?.rating ? Number(entry.rating) : 0);
  const [localNotes, setLocalNotes] = useState<string>(entry?.notes || '');
  const [localEpisodes, setLocalEpisodes] = useState<number>(entry?.episodes_watched || 0);
  const [localStatus, setLocalStatus] = useState<AnimeStatus>(entry?.status || 'not_started');

  // Atualiza estados quando entry muda
  useState(() => {
    if (entry) {
      setLocalRating(entry.rating ? Number(entry.rating) : 0);
      setLocalNotes(entry.notes || '');
      setLocalEpisodes(entry.episodes_watched || 0);
      setLocalStatus(entry.status);
    }
  });

  // Função para adicionar à lista
  const handleAddToList = () => {
    if (!anime) return;

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

  // Função para atualizar episódios
  const handleEpisodesChange = (delta: number) => {
    const totalEps = anime?.episodes || entry?.total_episodes || 999;
    const newValue = Math.max(0, Math.min(totalEps, localEpisodes + delta));
    setLocalEpisodes(newValue);
    if (entry) {
      handleUpdate({ 
        episodes_watched: newValue,
        ...(newValue === totalEps && { status: 'completed' as AnimeStatus, completed_at: new Date().toISOString().split('T')[0] })
      });
    }
  };

  // Função para atualizar status
  const handleStatusChange = (status: AnimeStatus) => {
    setLocalStatus(status);
    if (entry) {
      handleUpdate({ 
        status,
        ...(status === 'completed' && { completed_at: new Date().toISOString().split('T')[0] })
      });
    }
  };

  // Função para salvar notas
  const handleSaveNotes = () => {
    if (entry) {
      handleUpdate({ notes: localNotes });
      toast.success('Notas salvas!');
    }
  };

  if (!anime && !userEntry && !loadingDetails) {
    return null;
  }

  const totalEpisodes = anime?.episodes || entry?.total_episodes;
  const imageUrl = anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url || entry?.image_url;
  const title = anime?.title || entry?.title || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-card border-border/50 p-0">
        {loadingDetails ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Header com imagem de fundo */}
            <div className="relative h-48 md:h-64 overflow-hidden">
              <img
                src={imageUrl || '/placeholder.svg'}
                alt={title}
                className="w-full h-full object-cover opacity-30 blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
              
              {/* Botão de fechar */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Imagem e título */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex gap-6">
                <img
                  src={imageUrl || '/placeholder.svg'}
                  alt={title}
                  className="w-24 md:w-32 h-36 md:h-48 object-cover rounded-xl shadow-2xl border border-border/50 -mb-12"
                />
                <div className="flex-1 min-w-0 pb-2">
                  <DialogHeader>
                    <DialogTitle className="text-xl md:text-2xl font-display font-bold line-clamp-2">
                      {title}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Info rápida */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    {anime?.year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {anime.year}
                      </span>
                    )}
                    {totalEpisodes && (
                      <span className="flex items-center gap-1">
                        <Tv className="h-4 w-4" />
                        {totalEpisodes} eps
                      </span>
                    )}
                    {anime?.score && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-warning fill-warning" />
                        {anime.score.toFixed(1)} MAL
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 pt-16 space-y-6">
              {/* Gêneros */}
              {anime?.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {anime.genres.map((genre) => (
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

                  {/* Progresso */}
                  {totalEpisodes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Progresso
                      </label>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEpisodesChange(-1)}
                          disabled={localEpisodes <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold min-w-[100px] text-center">
                          {localEpisodes} / {totalEpisodes}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEpisodesChange(1)}
                          disabled={localEpisodes >= totalEpisodes}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Barra de progresso */}
                      <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary rounded-full transition-all duration-300"
                          style={{ width: `${(localEpisodes / totalEpisodes) * 100}%` }}
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveNotes}
                      className="mt-2"
                    >
                      Salvar Notas
                    </Button>
                  </div>
                </div>
              )}

              {/* Sinopse */}
              {anime?.synopsis && (
                <div>
                  <h3 className="font-semibold mb-2">Sinopse</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {anime.synopsis}
                  </p>
                </div>
              )}

              {/* Informações adicionais */}
              {anime && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {anime.status && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium text-sm">{anime.status}</p>
                    </div>
                  )}
                  {anime.type && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="font-medium text-sm">{anime.type}</p>
                    </div>
                  )}
                  {anime.studios && anime.studios.length > 0 && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Estúdio</p>
                      <p className="font-medium text-sm">{anime.studios[0].name}</p>
                    </div>
                  )}
                  {anime.rating && (
                    <div className="glass-card p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Classificação</p>
                      <p className="font-medium text-sm">{anime.rating}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
