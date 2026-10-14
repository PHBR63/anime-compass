import sources from '@/data/annSources.json';

/** Vínculo MAL→ANN verificado no pacote aprovado; nunca associa obras pelo título. */
export function getAnnSource(malId: number | null | undefined) {
  if (!Number.isSafeInteger(malId) || !malId || malId < 1) return null;
  const id = (sources as Record<string, number>)[String(malId)];
  return id ? { id, url: `https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${id}` } : null;
}

/** Revalida apenas caches dos títulos enriquecidos; os demais continuam disponíveis offline. */
export function isAnnCacheCurrent(malId: number, metadata: unknown): boolean {
  const source = getAnnSource(malId);
  if (!source) return true;
  const ann = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>).ann : null;
  return !!ann && typeof ann === 'object' && (ann as Record<string, unknown>).id === source.id;
}
