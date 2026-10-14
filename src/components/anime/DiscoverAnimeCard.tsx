import React, { useCallback } from 'react';
import { Plus, Check, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimeCardImage } from '@/components/ui/lazy-image';
import { useAnimeEntriesContext } from '@/contexts/AnimeEntriesContext';
import { getUsableAnimeImageUrl, isCurrentAnimeImageUrl } from '@/lib/animeImageSources';
import { TYPE_LABELS } from '@/lib/discoverParams';
import { toast } from 'sonner';
import type { DiscoverCardAnime } from '@/hooks/useDiscover';

interface Props {
  anime: DiscoverCardAnime;
  onOpen: (malId: number) => void;
}

/** Linha de metadados do card: formato · ano · episódios. */
export function formatCardMeta(a: Pick<DiscoverCardAnime, 'type' | 'year' | 'episodes' | 'status'>): string {
  const partes: string[] = [];
  if (a.type) partes.push(TYPE_LABELS[a.type] ?? a.type);
  partes.push(a.year ? String(a.year) : 'Ano ?');
  if (a.episodes) partes.push(`${a.episodes} ep${a.episodes > 1 ? 's' : ''}`);
  else if (a.status === 'Airing' || a.status === 'Currently Airing') partes.push('Em andamento');
  return partes.join(' · ');
}

/**
 * Card compacto da Descobrir: capa clicável (abre a ficha), título abaixo da capa,
 * metadados e botão de adicionar sempre visível (acessível por teclado e toque).
 */
function DiscoverAnimeCardBase({ anime, onOpen }: Props) {
  const { isInList, addEntry } = useAnimeEntriesContext();
  const inList = isInList(anime.mal_id);
  const titulo = anime.title_english || anime.title;
  const pendente = addEntry.isPending && addEntry.variables?.mal_id === anime.mal_id;

  // Adiciona à lista como "não iniciado"; já presente = sem ação.
  const adicionar = useCallback(() => {
    if (inList) return;
    const capa = (anime.local_image_url && isCurrentAnimeImageUrl(anime.local_image_url) ? anime.local_image_url : undefined)
      || getUsableAnimeImageUrl(anime.image_url) || '/placeholder.svg';
    addEntry.mutate(
      { mal_id: anime.mal_id, title: anime.title, image_url: capa, total_episodes: anime.episodes, status: 'not_started' },
      {
        onSuccess: () => toast.success(`${titulo} adicionado à sua lista!`),
        onError: () => toast.error('Erro ao adicionar anime'),
      },
    );
  }, [inList, addEntry, anime, titulo]);

  return (
    <article className="flex flex-col gap-2 min-w-0">
      <button
        type="button"
        onClick={() => onOpen(anime.mal_id)}
        className="relative aspect-[3/4] overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Abrir detalhes de ${titulo}`}
      >
        <AnimeCardImage src={anime.image_url || '/placeholder.svg'} localSrc={anime.local_image_url || undefined} alt="" showHoverEffect />
        {anime.score ? (
          <span className="absolute top-2 right-2 bg-background/85 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
            <Star className="h-3 w-3 text-warning fill-warning" aria-hidden />
            <span className="sr-only">Nota</span>{Number(anime.score).toFixed(1)}
          </span>
        ) : null}
        {inList && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-semibold">
            Na lista
          </span>
        )}
      </button>
      <div className="min-w-0 space-y-0.5">
        <h3 className="text-sm font-medium leading-tight line-clamp-2" title={titulo}>{titulo}</h3>
        <p className="text-xs text-muted-foreground truncate">{formatCardMeta(anime)}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={inList ? 'secondary' : 'outline'}
        className="h-9 gap-1 w-full"
        onClick={adicionar}
        disabled={inList || pendente}
        aria-label={inList ? `${titulo} já está na sua lista` : `Adicionar ${titulo} à lista`}
      >
        {pendente ? <Loader2 className="h-4 w-4 animate-spin" /> : inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {inList ? 'Na lista' : 'Adicionar'}
      </Button>
    </article>
  );
}

export const DiscoverAnimeCard = React.memo(DiscoverAnimeCardBase);
