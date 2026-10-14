/**
 * Tipos para o catálogo de animes local
 * Usados pela API própria (anime-api) e hooks relacionados
 */

import { getUsableAnimeImageUrl, isCurrentAnimeImageUrl } from '@/lib/animeImageSources';

// Anime do catálogo local
export interface CatalogAnime {
  id: string;
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  synopsis_pt: string | null;
  image_url: string | null;
  local_image_url: string | null;
  score: number | null;
  scored_by: number | null;
  episodes: number | null;
  status: string | null;
  type: string | null;
  rating: string | null;
  year: number | null;
  season: string | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  genres: GenreItem[];
  studios: StudioItem[];
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

// Gênero do catálogo
export interface GenreItem {
  mal_id: number;
  name: string;
  count?: number;
}

// Estúdio do catálogo
export interface StudioItem {
  mal_id: number;
  name: string;
  count?: number;
}

// Filtros de busca
export interface AnimeFilters {
  search?: string;
  status?: string | string[];
  type?: string | string[];
  season?: string | string[];
  genre?: number | string;
  studio?: number | string;
  year_min?: number;
  year_max?: number;
  score_min?: number;
  score_max?: number;
  has_image?: boolean;
}

// Opções de ordenação
export type AnimeSortField = 'score' | 'popularity' | 'year' | 'title' | 'rank' | 'members' | 'created_at' | 'updated_at';
export type AnimeSortOrder = 'asc' | 'desc';

export interface AnimeSortOptions {
  field: AnimeSortField;
  order: AnimeSortOrder;
}

// Paginação
export interface AnimePagination {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Resposta da API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: PaginationMeta;
  meta?: Record<string, unknown>;
}

// Estatísticas do catálogo
export interface CatalogStats {
  total_anime: number;
  with_images: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  year_range: { min: number; max: number };
  score_range: { min: number; max: number };
  last_sync: string | null;
}

// Status de sincronização
export interface SyncStatus {
  is_syncing: boolean;
  last_sync: string | null;
  next_sync: string | null;
  total_in_catalog: number;
}

// Mapeamento de tipos para exibição
export const ANIME_TYPES: Record<string, string> = {
  'TV': 'TV',
  'Movie': 'Filme',
  'OVA': 'OVA',
  'ONA': 'ONA',
  'Special': 'Especial',
  'Music': 'Música',
};

// Mapeamento de status para exibição
export const ANIME_STATUS: Record<string, string> = {
  'Finished Airing': 'Finalizado',
  'Currently Airing': 'Em Exibição',
  'Airing': 'Em Exibição',
  'Not yet aired': 'Não Lançado',
};

// Mapeamento de temporadas para exibição
export const ANIME_SEASONS: Record<string, string> = {
  'winter': 'Inverno',
  'spring': 'Primavera',
  'summer': 'Verão',
  'fall': 'Outono',
};

/** Obtém a capa, priorizando apenas imagens locais do projeto atual. */
export function getAnimeImageUrl(anime: CatalogAnime): string {
  return (anime.local_image_url && isCurrentAnimeImageUrl(anime.local_image_url)
    ? anime.local_image_url : undefined) || getUsableAnimeImageUrl(anime.image_url) || '/placeholder.svg';
}

// Helper para obter sinopse (prioriza PT-BR)
export function getAnimeSynopsis(anime: CatalogAnime): string | null {
  return anime.synopsis_pt || anime.synopsis;
}

// Helper para formatar ano/temporada
export function formatSeasonYear(anime: CatalogAnime): string {
  if (!anime.year) return 'N/A';
  
  const season = anime.season ? ANIME_SEASONS[anime.season] || anime.season : '';
  return season ? `${season} ${anime.year}` : String(anime.year);
}

// Helper para obter título em português ou inglês
export function getDisplayTitle(anime: CatalogAnime): string {
  return anime.title_english || anime.title;
}
