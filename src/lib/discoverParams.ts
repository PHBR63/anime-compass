/**
 * Estado da página Descobrir serializado na URL (fonte única da verdade).
 * Funções puras: convertem URL <-> filtros, validam intervalos e montam o
 * payload enviado à função SQL `discover_catalog`.
 */

/** Modos de navegação visíveis na página. */
export type DiscoverMode = 'catalog' | 'season' | 'airing' | 'upcoming';
/** Campos de ordenação aceitos pelo banco. */
export type DiscoverSortField = 'score' | 'popularity' | 'year' | 'title';
export type SeasonName = 'winter' | 'spring' | 'summer' | 'fall';

export interface DiscoverState {
  mode: DiscoverMode;
  search: string;
  genre: string | null;
  studio: string | null;
  type: string | null;
  status: 'airing' | 'finished' | 'upcoming' | null;
  yearMin: number | null;
  yearMax: number | null;
  scoreMin: number | null;
  sort: DiscoverSortField;
  season: SeasonName;
  seasonYear: number;
}

export const SEASONS: { value: SeasonName; label: string }[] = [
  { value: 'winter', label: 'Inverno (jan–mar)' },
  { value: 'spring', label: 'Primavera (abr–jun)' },
  { value: 'summer', label: 'Verão (jul–set)' },
  { value: 'fall', label: 'Outono (out–dez)' },
];

export const SORT_OPTIONS: { value: DiscoverSortField; label: string; order: 'asc' | 'desc' }[] = [
  { value: 'score', label: 'Melhor nota', order: 'desc' },
  { value: 'popularity', label: 'Mais populares', order: 'asc' },
  { value: 'year', label: 'Mais recentes', order: 'desc' },
  { value: 'title', label: 'Título (A–Z)', order: 'asc' },
];

export const STATUS_OPTIONS = [
  { value: 'airing', label: 'Em exibição' },
  { value: 'finished', label: 'Finalizado' },
  { value: 'upcoming', label: 'Não lançado' },
] as const;

export const TYPE_LABELS: Record<string, string> = {
  TV: 'TV', Movie: 'Filme', OVA: 'OVA', ONA: 'ONA', Special: 'Especial',
};

/** Temporada (trimestre) de uma data, no padrão MAL. */
export function seasonOf(date: Date): { season: SeasonName; year: number } {
  const m = date.getMonth();
  const season: SeasonName = m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'fall';
  return { season, year: date.getFullYear() };
}

/** Converte texto em inteiro dentro de limites; inválido vira null. */
function toInt(v: string | null, min: number, max: number): number | null {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** Lê o estado da URL, descartando valores inválidos (ex.: ano máximo menor que o mínimo). */
export function parseDiscoverParams(sp: URLSearchParams, now = new Date()): DiscoverState {
  const atual = seasonOf(now);
  const modeRaw = sp.get('modo');
  const mode: DiscoverMode = modeRaw === 'season' || modeRaw === 'airing' || modeRaw === 'upcoming' ? modeRaw : 'catalog';
  const sortRaw = sp.get('ordem');
  const sort: DiscoverSortField = SORT_OPTIONS.some(o => o.value === sortRaw) ? (sortRaw as DiscoverSortField) : 'score';
  const statusRaw = sp.get('status');
  const status = STATUS_OPTIONS.some(o => o.value === statusRaw) ? (statusRaw as DiscoverState['status']) : null;
  const seasonRaw = sp.get('temporada');
  const season = SEASONS.some(s => s.value === seasonRaw) ? (seasonRaw as SeasonName) : atual.season;
  const yearMin = toInt(sp.get('de'), 1800, 2200);
  let yearMax = toInt(sp.get('ate'), 1800, 2200);
  if (yearMin !== null && yearMax !== null && yearMax < yearMin) yearMax = null;
  const score = sp.get('nota') ? Number(sp.get('nota')) : null;
  return {
    mode,
    search: (sp.get('q') ?? '').slice(0, 100),
    genre: sp.get('genero') || null,
    studio: sp.get('estudio') || null,
    type: sp.get('tipo') || null,
    status,
    yearMin,
    yearMax,
    scoreMin: score !== null && Number.isFinite(score) && score >= 0 && score <= 10 ? score : null,
    sort,
    season,
    seasonYear: toInt(sp.get('ano_temporada'), 1800, 2200) ?? atual.year,
  };
}

/** Serializa o estado na URL, omitindo valores padrão para manter links curtos. */
export function toDiscoverParams(s: DiscoverState, now = new Date()): URLSearchParams {
  const sp = new URLSearchParams();
  const atual = seasonOf(now);
  if (s.mode !== 'catalog') sp.set('modo', s.mode);
  if (s.search.trim()) sp.set('q', s.search.trim());
  if (s.genre) sp.set('genero', s.genre);
  if (s.studio) sp.set('estudio', s.studio);
  if (s.type) sp.set('tipo', s.type);
  if (s.status && s.mode === 'catalog') sp.set('status', s.status);
  if (s.yearMin !== null) sp.set('de', String(s.yearMin));
  if (s.yearMax !== null) sp.set('ate', String(s.yearMax));
  if (s.scoreMin !== null) sp.set('nota', String(s.scoreMin));
  if (s.sort !== 'score') sp.set('ordem', s.sort);
  if (s.mode === 'season') {
    if (s.season !== atual.season || s.seasonYear !== atual.year) {
      sp.set('temporada', s.season);
      sp.set('ano_temporada', String(s.seasonYear));
    }
  }
  return sp;
}

/** Valida o intervalo de anos; devolve mensagem PT-BR ou null quando está ok. */
export function validateYearRange(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null && min > max) return 'O ano inicial deve ser menor ou igual ao ano final.';
  return null;
}

/** Monta o payload da função SQL (o modo define status/temporada implícitos). */
export function toRpcFilters(s: DiscoverState, hideInList: boolean): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  if (s.search.trim().length >= 2) p.search = s.search.trim();
  if (s.genre) p.genre = s.genre;
  if (s.studio) p.studio = s.studio;
  if (s.type) p.type = s.type;
  if (s.yearMin !== null) p.year_min = s.yearMin;
  if (s.yearMax !== null) p.year_max = s.yearMax;
  if (s.scoreMin !== null) p.score_min = s.scoreMin;
  if (s.mode === 'catalog' && s.status) p.status = s.status;
  if (s.mode === 'airing') p.status = 'airing';
  if (s.mode === 'upcoming') p.status = 'upcoming';
  if (s.mode === 'season') { p.season = s.season; p.season_year = s.seasonYear; }
  if (hideInList) p.hide_in_list = true;
  return p;
}

/** Ordem (asc/desc) associada ao campo de ordenação. */
export function sortOrderOf(field: DiscoverSortField): 'asc' | 'desc' {
  return SORT_OPTIONS.find(o => o.value === field)?.order ?? 'desc';
}

/** Lista os filtros ativos removíveis (chips), cada um com a chave que limpa. */
export function activeChips(s: DiscoverState): { key: keyof DiscoverState | 'years'; label: string }[] {
  const chips: { key: keyof DiscoverState | 'years'; label: string }[] = [];
  if (s.search.trim()) chips.push({ key: 'search', label: `Busca: ${s.search.trim()}` });
  if (s.genre) chips.push({ key: 'genre', label: `Gênero: ${s.genre}` });
  if (s.studio) chips.push({ key: 'studio', label: `Estúdio: ${s.studio}` });
  if (s.type) chips.push({ key: 'type', label: `Formato: ${TYPE_LABELS[s.type] ?? s.type}` });
  if (s.status && s.mode === 'catalog') chips.push({ key: 'status', label: STATUS_OPTIONS.find(o => o.value === s.status)!.label });
  if (s.yearMin !== null || s.yearMax !== null) {
    chips.push({ key: 'years', label: `Ano: ${s.yearMin ?? '…'}–${s.yearMax ?? '…'}` });
  }
  if (s.scoreMin !== null) chips.push({ key: 'scoreMin', label: `Nota ≥ ${s.scoreMin}` });
  return chips;
}

/** Remove um chip específico do estado. */
export function removeChip(s: DiscoverState, key: keyof DiscoverState | 'years'): DiscoverState {
  if (key === 'years') return { ...s, yearMin: null, yearMax: null };
  if (key === 'search') return { ...s, search: '' };
  return { ...s, [key]: null } as DiscoverState;
}

/** Limpa todos os filtros mantendo modo, temporada e ordenação. */
export function clearFilters(s: DiscoverState): DiscoverState {
  return { ...s, search: '', genre: null, studio: null, type: null, status: null, yearMin: null, yearMax: null, scoreMin: null };
}

/** Chave da preferência "ocultar o que já está na lista", isolada por conta. */
export function hideInListStorageKey(userId: string | null | undefined): string | null {
  return userId ? `discover-hide-in-list:${userId}` : null;
}
