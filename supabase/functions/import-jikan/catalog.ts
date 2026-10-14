// Tipos de dados aceitos do Jikan para importar animes sem alterar traduções.
export interface AnimeJikan {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
  images?: { webp?: { large_image_url?: string }; jpg?: { large_image_url?: string; image_url?: string } };
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  episodes?: number | null;
  status?: string | null;
  type?: string | null;
  rating?: string | null;
  year?: number | null;
  season?: string | null;
  genres?: { mal_id: number; name: string }[];
  studios?: { mal_id: number; name: string }[];
}

export interface TextosExistentes {
  mal_id: number;
  title?: string | null;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
}

/** Exclui conteúdos promocionais e musicais do catálogo. */
export function permitirAnime(anime: AnimeJikan): boolean {
  return !["Music", "CM", "PV"].includes(anime.type ?? "");
}

/** Aceita apenas capas HTTPS do CDN do MAL, sem URLs arbitrárias. */
export function obterCapa(anime: AnimeJikan): string | null {
  const candidatos = [anime.images?.webp?.large_image_url, anime.images?.jpg?.large_image_url, anime.images?.jpg?.image_url];
  for (const candidato of candidatos) {
    if (!candidato) continue;
    try {
      const url = new URL(candidato);
      if (url.protocol === "https:" && url.hostname === "cdn.myanimelist.net") return url.href;
    } catch { /* Ignora endereços inválidos retornados pela fonte. */ }
  }
  return null;
}

/** Atualiza metadados e preenche somente textos vazios; nunca envia synopsis_pt ou local_image_url. */
export function mapearAnime(anime: AnimeJikan, existente?: TextosExistentes) {
  const textos: Record<string, string | null> = {};
  for (const campo of ["title", "title_english", "title_japanese", "synopsis"] as const) {
    if (!existente?.[campo]?.trim()) textos[campo] = anime[campo] ?? null;
  }
  const capa = obterCapa(anime);
  return {
    mal_id: anime.mal_id,
    ...textos,
    ...(capa ? { image_url: capa } : {}),
    score: anime.score ?? null,
    scored_by: anime.scored_by ?? null,
    rank: anime.rank ?? null,
    popularity: anime.popularity ?? null,
    members: anime.members ?? null,
    episodes: anime.episodes ?? null,
    status: anime.status ?? null,
    type: anime.type ?? null,
    rating: anime.rating ?? null,
    year: anime.year ?? null,
    season: anime.season ?? null,
    // Preserva também nomes de gêneros/estúdios já cadastrados em português.
    ...(!existente ? { genres: anime.genres ?? [], studios: anime.studios ?? [] } : {}),
    last_synced_at: new Date().toISOString(),
  };
}