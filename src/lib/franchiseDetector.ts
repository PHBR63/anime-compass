/**
 * Utilitário para detectar e agrupar animes por franquia
 * Identifica séries relacionadas através de padrões nos títulos
 */

// Padrões comuns que indicam temporadas, filmes, OVAs, etc.
const SEASON_PATTERNS = [
  // Números ordinais em inglês
  /\s+(2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s+season/i,
  /\s+season\s+(\d+)/i,
  // Partes
  /\s+part\s+(\d+)/i,
  /\s+cour\s+(\d+)/i,
  // Números romanos
  /\s+(II|III|IV|V|VI|VII|VIII|IX|X)$/,
  /\s+(II|III|IV|V|VI|VII|VIII|IX|X):/,
  // Japonês
  /\s+(\d+)(?:期|ki)$/i,
  // Sufixos comuns de temporada
  /:\s*(2nd|3rd|4th|5th|second|third|fourth|fifth)\s+season/i,
  /\s+-\s+(2nd|3rd|4th|5th|second|third|fourth|fifth)\s+season/i,
];

const SEQUEL_PATTERNS = [
  /\s+final\s+season/i,
  /\s+the\s+final/i,
  /\s+final\s+chapter/i,
  /\s+new\s+world/i,
  /\s+new\s+series/i,
  /\s+next\s+generations?/i,
  /\s+shippuden/i,
  /\s+shippuuden/i,
  /\s+gt$/i,
  /\s+z$/i,
  /\s+kai$/i,
  /\s+super$/i,
  /\s+brotherhood/i,
  /\s+zero$/i,
  /\s+re:?$/i,
  /\s+2$/,
  /\s+3$/,
];

const MOVIE_PATTERNS = [
  /\s+movie\s*(\d*)/i,
  /\s+the\s+movie/i,
  /\s+film\s*(\d*)/i,
  /\s+gekijouban/i,
  /\s+gekijoban/i,
  /\s+-\s+movie/i,
  /:\s+movie/i,
];

const SPECIAL_PATTERNS = [
  /\s+ova\s*(\d*)/i,
  /\s+oad\s*(\d*)/i,
  /\s+special\s*(\d*)/i,
  /\s+specials?$/i,
  /\s+recap/i,
  /\s+prologue/i,
  /\s+epilogue/i,
  /\s+episode\s+0/i,
  /\s+-hen$/i,
];

// Padrões de subtítulo após ":"
const SUBTITLE_PATTERN = /^(.+?)\s*[:：]\s*.+$/;

export interface AnimeEntry {
  id: string;
  title: string;
  mal_id: number;
  status: string;
  rating: number | null;
  image_url: string | null;
  episodes_watched: number | null;
  total_episodes: number | null;
  is_favorite: boolean | null;
  [key: string]: unknown;
}

export interface FranchiseGroup {
  baseName: string;
  entries: AnimeEntry[];
  totalEntries: number;
  completedCount: number;
  watchingCount: number;
  pausedCount: number;
  droppedCount: number;
  averageRating: number | null;
  totalEpisodes: number;
  watchedEpisodes: number;
  progressPercent: number;
  types: {
    mainSeries: AnimeEntry[];
    seasons: AnimeEntry[];
    movies: AnimeEntry[];
    specials: AnimeEntry[];
  };
}

export type AnimeType = 'main' | 'season' | 'movie' | 'special';

/**
 * Determina o tipo do anime baseado no título
 */
export function detectAnimeType(title: string): AnimeType {
  const lowerTitle = title.toLowerCase();
  
  // Verificar se é filme
  for (const pattern of MOVIE_PATTERNS) {
    if (pattern.test(lowerTitle)) return 'movie';
  }
  
  // Verificar se é especial/OVA
  for (const pattern of SPECIAL_PATTERNS) {
    if (pattern.test(lowerTitle)) return 'special';
  }
  
  // Verificar se é temporada adicional
  for (const pattern of SEASON_PATTERNS) {
    if (pattern.test(lowerTitle)) return 'season';
  }
  
  // Verificar padrões de sequência
  for (const pattern of SEQUEL_PATTERNS) {
    if (pattern.test(lowerTitle)) return 'season';
  }
  
  return 'main';
}

/**
 * Extrai o nome base da franquia removendo sufixos de temporada, filme, etc.
 */
export function extractBaseFranchise(title: string): string {
  let baseName = title.trim();
  
  // Lista de todos os padrões para remover
  const allPatterns = [
    ...SEASON_PATTERNS,
    ...SEQUEL_PATTERNS,
    ...MOVIE_PATTERNS,
    ...SPECIAL_PATTERNS,
  ];
  
  // Remover padrões conhecidos
  for (const pattern of allPatterns) {
    baseName = baseName.replace(pattern, '');
  }
  
  // Tentar extrair nome base do subtítulo
  const subtitleMatch = baseName.match(SUBTITLE_PATTERN);
  if (subtitleMatch) {
    const potentialBase = subtitleMatch[1].trim();
    // Só usar se o nome base for significativo (mais de 3 caracteres)
    if (potentialBase.length > 3) {
      baseName = potentialBase;
    }
  }
  
  // Limpar espaços extras e pontuação final
  baseName = baseName.trim().replace(/[-:]\s*$/, '').trim();
  
  // Normalizar para comparação (lowercase, sem pontuação especial)
  return baseName;
}

/**
 * Normaliza o nome para comparação (ignora maiúsculas e pontuação)
 */
function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Agrupa animes por franquia
 */
export function groupByFranchise(entries: AnimeEntry[]): FranchiseGroup[] {
  const franchiseMap = new Map<string, AnimeEntry[]>();
  
  // Agrupar por nome base normalizado
  for (const entry of entries) {
    const baseName = extractBaseFranchise(entry.title);
    const normalizedBase = normalizeForComparison(baseName);
    
    const existing = franchiseMap.get(normalizedBase);
    if (existing) {
      existing.push(entry);
    } else {
      franchiseMap.set(normalizedBase, [entry]);
    }
  }
  
  // Converter para array de FranchiseGroup
  const groups: FranchiseGroup[] = [];
  
  for (const [_, groupEntries] of franchiseMap) {
    // Encontrar o nome base mais comum/curto
    const baseNames = groupEntries.map(e => extractBaseFranchise(e.title));
    const shortestBase = baseNames.reduce((a, b) => a.length <= b.length ? a : b);
    
    // Separar por tipo
    const mainSeries: AnimeEntry[] = [];
    const seasons: AnimeEntry[] = [];
    const movies: AnimeEntry[] = [];
    const specials: AnimeEntry[] = [];
    
    for (const entry of groupEntries) {
      const type = detectAnimeType(entry.title);
      switch (type) {
        case 'main':
          mainSeries.push(entry);
          break;
        case 'season':
          seasons.push(entry);
          break;
        case 'movie':
          movies.push(entry);
          break;
        case 'special':
          specials.push(entry);
          break;
      }
    }
    
    // Calcular estatísticas
    const completedCount = groupEntries.filter(e => e.status === 'completed').length;
    const watchingCount = groupEntries.filter(e => e.status === 'watching').length;
    const pausedCount = groupEntries.filter(e => e.status === 'paused').length;
    const droppedCount = groupEntries.filter(e => e.status === 'dropped').length;
    
    const ratings = groupEntries
      .filter(e => e.rating !== null && e.rating !== undefined)
      .map(e => e.rating as number);
    const averageRating = ratings.length > 0 
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;
    
    // Calcular episódios totais e assistidos
    const totalEpisodes = groupEntries.reduce((sum, e) => sum + (e.total_episodes || 0), 0);
    const watchedEpisodes = groupEntries.reduce((sum, e) => sum + (e.episodes_watched || 0), 0);
    const progressPercent = totalEpisodes > 0 
      ? Math.round((watchedEpisodes / totalEpisodes) * 100)
      : 0;
    
    groups.push({
      baseName: shortestBase,
      entries: groupEntries,
      totalEntries: groupEntries.length,
      completedCount,
      watchingCount,
      pausedCount,
      droppedCount,
      averageRating,
      totalEpisodes,
      watchedEpisodes,
      progressPercent,
      types: {
        mainSeries,
        seasons,
        movies,
        specials,
      },
    });
  }
  
  // Ordenar por número de entradas (franquias maiores primeiro)
  return groups.sort((a, b) => b.totalEntries - a.totalEntries);
}

/**
 * Filtra franquias completamente assistidas
 */
export function getCompletedFranchises(groups: FranchiseGroup[]): FranchiseGroup[] {
  return groups.filter(g => g.completedCount === g.totalEntries && g.totalEntries > 0);
}

/**
 * Filtra franquias em progresso (pelo menos uma temporada assistindo)
 */
export function getInProgressFranchises(groups: FranchiseGroup[]): FranchiseGroup[] {
  return groups.filter(g => g.watchingCount > 0);
}

/**
 * Filtra franquias quase completas (75%+ de progresso)
 */
export function getNearlyCompleteFranchises(groups: FranchiseGroup[]): FranchiseGroup[] {
  return groups.filter(g => 
    g.progressPercent >= 75 && 
    g.progressPercent < 100 && 
    g.totalEntries > 1
  );
}

/**
 * Filtra franquias abandonadas (pausadas ou dropadas)
 */
export function getAbandonedFranchises(groups: FranchiseGroup[]): FranchiseGroup[] {
  return groups.filter(g => 
    (g.pausedCount > 0 || g.droppedCount > 0) && 
    g.watchingCount === 0
  );
}

/**
 * Filtra franquias com múltiplas temporadas
 */
export function getMultiSeasonFranchises(groups: FranchiseGroup[]): FranchiseGroup[] {
  return groups.filter(g => g.totalEntries > 1);
}

/**
 * Filtra franquias por tamanho (baseado em episódios totais)
 */
export function getFranchisesBySize(
  groups: FranchiseGroup[], 
  size: 'small' | 'medium' | 'large'
): FranchiseGroup[] {
  switch (size) {
    case 'small':
      return groups.filter(g => g.totalEpisodes < 25);
    case 'medium':
      return groups.filter(g => g.totalEpisodes >= 25 && g.totalEpisodes < 50);
    case 'large':
      return groups.filter(g => g.totalEpisodes >= 50);
  }
}

/**
 * Filtra apenas filmes
 */
export function getMoviesOnly(entries: AnimeEntry[]): AnimeEntry[] {
  return entries.filter(e => detectAnimeType(e.title) === 'movie');
}

/**
 * Filtra franquias com alta avaliação média
 */
export function getHighRatedFranchises(groups: FranchiseGroup[], minRating: number = 4): FranchiseGroup[] {
  return groups.filter(g => g.averageRating !== null && g.averageRating >= minRating);
}
