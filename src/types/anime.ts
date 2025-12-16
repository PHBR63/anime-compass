export type AnimeStatus = 'watching' | 'completed' | 'paused' | 'dropped' | 'planned';

export interface Anime {
  id: string;
  malId: number;
  title: string;
  titleEnglish?: string;
  imageUrl: string;
  synopsis?: string;
  score?: number;
  episodes?: number;
  status: string;
  season?: string;
  year?: number;
  genres: string[];
  studios: string[];
}

export interface UserAnimeEntry {
  id: string;
  animeId: string;
  anime: Anime;
  status: AnimeStatus;
  rating?: number;
  episodesWatched: number;
  isFavorite: boolean;
  isArchived: boolean;
  notes?: string;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
  createdAt: Date;
}

export interface UserStats {
  totalAnimes: number;
  totalEpisodes: number;
  totalTimeMinutes: number;
  averageRating: number;
  completionRate: number;
  byStatus: Record<AnimeStatus, number>;
  byRating: Record<number, number>;
}

export interface AnimeList {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  animeIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
