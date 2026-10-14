// Tipos e mapeamento dos animes vindos do Kitsu (sucessor do Hummingbird).
// Princípios: nunca sobrescrever dados já preenchidos pelo Jikan ou traduções PT-BR,
// preencher apenas campos vazios quando o anime já existe no catálogo.

// Atributos de um anime do Kitsu conforme a API JSON:API (kitsu.app/api/edge).
export interface AnimeKitsu {
  id: string;
  attributes: {
    canonicalTitle?: string | null;
    titles?: Record<string, string | null> | null;
    synopsis?: string | null;
    subtype?: string | null;
    status?: string | null;
    episodeCount?: number | string | null;
    averageRating?: number | string | null;
    userCount?: number | null;
    popularityRank?: number | null;
    ratingRank?: number | null;
    startDate?: string | null;
    season?: string | null;
    seasonYear?: number | null;
    ageRating?: string | null;
    posterImage?: { original?: string; large?: string; medium?: string; small?: string } | null;
  };
}

/** Campos do catálogo relevantes para o preenchimento pelo Kitsu. */
export interface TextosExistentesKitsu {
  title?: string | null;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
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
  image_url?: string | null;
  local_image_url?: string | null;
}

/** Converte o status do Kitsu para os valores usados no catálogo (padrão Jikan). */
export function mapearStatusKitsu(status: string | null | undefined): string | null {
  switch (status) {
    case "current": return "Currently Airing";
    case "finished": return "Finished Airing";
    case "upcoming": case "unreleased": case "tba": return "Not yet aired";
    default: return null;
  }
}

/** Converte o formato (subtype) do Kitsu para o tipo usado no catálogo. */
export function mapearTipoKitsu(subtype: string | null | undefined): string | null {
  switch (subtype) {
    case "TV": return "TV";
    case "movie": return "Movie";
    case "OVA": case "ONA": return subtype;
    case "special": return "Special";
    case "music": return "Music";
    default: return null;
  }
}

/** Converte a classificação etária do Kitsu para o texto padrão do Jikan. */
export function mapearClassificacaoKitsu(idade: string | null | undefined): string | null {
  switch (idade) {
    case "G": return "G - All Ages";
    case "PG": return "PG - Children";
    case "R": return "R - 17+ (violence & profanity)";
    case "R17": return "R+ - Mild Nudity";
    case "Rx": return "Rx - Hentai";
    default: return null;
  }
}

/** Exclui conteúdos promocionais e musicais do catálogo (mesma regra do Jikan). */
export function permitirAnimeKitsu(anime: AnimeKitsu): boolean {
  const tipo = anime.attributes.subtype ?? "";
  return tipo !== "music" && tipo !== "unknown" && !!anime.attributes.canonicalTitle;
}

/** Aceita apenas capas HTTPS hospedadas no CDN oficial do Kitsu, sem URLs arbitrárias. */
export function obterCapaKitsu(anime: AnimeKitsu): string | null {
  const candidatos = [anime.attributes.posterImage?.original, anime.attributes.posterImage?.large, anime.attributes.posterImage?.medium];
  for (const candidato of candidatos) {
    if (!candidato) continue;
    try {
      const url = new URL(candidato);
      if (url.protocol === "https:" && (url.hostname === "media.kitsu.app" || url.hostname === "media.kitsu.io")) return url.href;
    } catch { /* Ignora endereços inválidos retornados pela fonte. */ }
  }
  return null;
}

/** Converte a nota (0 a 100) do Kitsu para a escala de 0 a 10 do catálogo. */
function converterNota(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const nota = Number(valor);
  if (!Number.isFinite(nota)) return null;
  return Math.round(nota / 10 * 100) / 100;
}

/** Extrai o ano a partir da data inicial quando a temporada não informa o ano. */
function extrairAno(atributos: AnimeKitsu["attributes"]): number | null {
  if (Number.isInteger(atributos.seasonYear)) return atributos.seasonYear as number;
  if (atributos.startDate) {
    const ano = Number(String(atributos.startDate).slice(0, 4));
    if (Number.isInteger(ano)) return ano;
  }
  return null;
}

/**
 * Mapeia um anime do Kitsu para o registro do catálogo.
 * - Anime novo (sem "existente"): mapeamento completo.
 * - Anime existente: preenche SOMENTE campos vazios/nulos; nunca sobrescreve
 *   textos, notas ou capas já cadastrados (o Jikan permanece a fonte principal).
 * Nunca envia synopsis_pt ou local_image_url.
 */
export function mapearAnimeKitsu(anime: AnimeKitsu, existente?: TextosExistentesKitsu) {
  const a = anime.attributes;
  const vazio = (valor: string | null | undefined) => !valor || !valor.trim();
  const nulo = (valor: unknown) => valor === null || valor === undefined;

  const registro: Record<string, unknown> = {};

  // Textos: apenas quando o campo está vazio.
  if (existente) {
    if (vazio(existente.title)) registro.title = a.canonicalTitle ?? null;
    if (vazio(existente.title_english)) registro.title_english = a.titles?.en ?? a.titles?.en_jp ?? null;
    if (vazio(existente.title_japanese)) registro.title_japanese = a.titles?.ja_jp ?? null;
    if (vazio(existente.synopsis)) registro.synopsis = a.synopsis ?? null;
    // Números: apenas quando o campo é nulo.
    const nota = converterNota(a.averageRating);
    if (nulo(existente.score)) registro.score = nota;
    if (nulo(existente.scored_by)) registro.scored_by = a.userCount ?? null;
    if (nulo(existente.rank)) registro.rank = a.ratingRank ?? null;
    if (nulo(existente.popularity)) registro.popularity = a.popularityRank ?? null;
    if (nulo(existente.members)) registro.members = a.userCount ?? null;
    if (nulo(existente.episodes)) registro.episodes = a.episodeCount == null ? null : Number(a.episodeCount) || null;
    if (nulo(existente.year)) registro.year = extrairAno(a);
    if (nulo(existente.season)) registro.season = a.season ?? null;
    if (nulo(existente.status)) registro.status = mapearStatusKitsu(a.status);
    if (nulo(existente.type)) registro.type = mapearTipoKitsu(a.subtype);
    if (nulo(existente.rating)) registro.rating = mapearClassificacaoKitsu(a.ageRating);
    // Capa reserva: só quando o anime não tem nenhuma imagem.
    const semImagem = !existente.image_url && !existente.local_image_url;
    const capa = semImagem ? obterCapaKitsu(anime) : null;
    if (capa) registro.image_url = capa;
  } else {
    registro.title = a.canonicalTitle ?? null;
    registro.title_english = a.titles?.en ?? a.titles?.en_jp ?? null;
    registro.title_japanese = a.titles?.ja_jp ?? null;
    registro.synopsis = a.synopsis ?? null;
    registro.score = converterNota(a.averageRating);
    registro.scored_by = a.userCount ?? null;
    registro.rank = a.ratingRank ?? null;
    registro.popularity = a.popularityRank ?? null;
    registro.members = a.userCount ?? null;
    registro.episodes = a.episodeCount == null ? null : Number(a.episodeCount) || null;
    registro.year = extrairAno(a);
    registro.season = a.season ?? null;
    registro.status = mapearStatusKitsu(a.status);
    registro.type = mapearTipoKitsu(a.subtype);
    registro.rating = mapearClassificacaoKitsu(a.ageRating);
    registro.image_url = obterCapaKitsu(anime);
    // Animes novos do Kitsu podem não ter gênero/estúdio; mantém listas vazias.
    registro.genres = [];
    registro.studios = [];
  }

  return registro;
}
