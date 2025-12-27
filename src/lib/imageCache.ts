/**
 * Sistema de cache local de imagens para carregamento offline
 * Utiliza Cache API do browser para persistir imagens de animes
 */

// Nome do cache dedicado para imagens
const IMAGE_CACHE_NAME = 'anicheck-images-v1';

// Limite máximo de imagens no cache (evita crescimento infinito)
const MAX_CACHED_IMAGES = 500;

// Tempo de expiração das imagens (30 dias em ms)
const IMAGE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Interface para metadados de imagem em cache
 */
interface CachedImageMeta {
  url: string;
  cachedAt: number;
  lastAccessed: number;
  size?: number;
}

// Key para armazenar metadados no localStorage
const META_STORAGE_KEY = 'anicheck-image-cache-meta';

/**
 * Obtém metadados das imagens em cache
 */
function getImageMeta(): Map<string, CachedImageMeta> {
  try {
    const stored = localStorage.getItem(META_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.warn('[ImageCache] Erro ao ler metadados:', e);
  }
  return new Map();
}

/**
 * Salva metadados das imagens em cache
 */
function saveImageMeta(meta: Map<string, CachedImageMeta>): void {
  try {
    const obj = Object.fromEntries(meta);
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('[ImageCache] Erro ao salvar metadados:', e);
  }
}

/**
 * Verifica se uma URL é uma imagem de anime válida para cache
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // URLs de imagens de anime que queremos cachear
  const validPatterns = [
    'cdn.myanimelist.net',
    'img.anili.st',
    'media.kitsu.io',
    's4.anilist.co',
  ];
  
  return validPatterns.some(pattern => url.includes(pattern));
}

/**
 * Adiciona uma imagem ao cache local
 */
export async function cacheImage(url: string): Promise<boolean> {
  if (!isValidImageUrl(url)) return false;
  
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const meta = getImageMeta();
    
    // Verifica se já está em cache e ainda é válido
    const existing = meta.get(url);
    if (existing) {
      const isExpired = Date.now() - existing.cachedAt > IMAGE_EXPIRATION_MS;
      if (!isExpired) {
        // Atualiza último acesso
        existing.lastAccessed = Date.now();
        saveImageMeta(meta);
        return true;
      }
    }
    
    // Limpa cache se exceder limite
    if (meta.size >= MAX_CACHED_IMAGES) {
      await cleanupOldestImages(meta, Math.floor(MAX_CACHED_IMAGES * 0.2));
    }
    
    // Faz fetch da imagem
    const response = await fetch(url, { 
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) return false;
    
    // Clona response para poder usar no cache
    const responseClone = response.clone();
    
    // Adiciona ao Cache API
    await cache.put(url, responseClone);
    
    // Atualiza metadados
    meta.set(url, {
      url,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      size: parseInt(response.headers.get('content-length') || '0', 10)
    });
    saveImageMeta(meta);
    
    return true;
  } catch (e) {
    console.warn('[ImageCache] Erro ao cachear imagem:', e);
    return false;
  }
}

/**
 * Obtém imagem do cache local
 */
export async function getCachedImage(url: string): Promise<Response | null> {
  if (!url) return null;
  
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cached = await cache.match(url);
    
    if (cached) {
      // Atualiza último acesso
      const meta = getImageMeta();
      const imageMeta = meta.get(url);
      if (imageMeta) {
        imageMeta.lastAccessed = Date.now();
        saveImageMeta(meta);
      }
      return cached;
    }
    
    return null;
  } catch (e) {
    console.warn('[ImageCache] Erro ao obter imagem do cache:', e);
    return null;
  }
}

/**
 * Verifica se uma imagem está em cache
 */
export async function isImageCached(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cached = await cache.match(url);
    return cached !== undefined;
  } catch {
    return false;
  }
}

/**
 * Remove imagens mais antigas do cache
 */
async function cleanupOldestImages(meta: Map<string, CachedImageMeta>, count: number): Promise<void> {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    
    // Ordena por último acesso (mais antigo primeiro)
    const sorted = Array.from(meta.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove as mais antigas
    const toRemove = sorted.slice(0, count);
    
    for (const [url] of toRemove) {
      await cache.delete(url);
      meta.delete(url);
    }
    
    saveImageMeta(meta);
    console.log(`[ImageCache] Removidas ${toRemove.length} imagens antigas`);
  } catch (e) {
    console.warn('[ImageCache] Erro ao limpar cache:', e);
  }
}

/**
 * Pré-carrega imagens de uma lista de animes
 */
export async function prefetchImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter(isValidImageUrl);
  
  // Processa em lotes para não sobrecarregar
  const batchSize = 5;
  for (let i = 0; i < validUrls.length; i += batchSize) {
    const batch = validUrls.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(cacheImage));
    
    // Pequeno delay entre lotes
    if (i + batchSize < validUrls.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
}

/**
 * Limpa todo o cache de imagens
 */
export async function clearImageCache(): Promise<void> {
  try {
    await caches.delete(IMAGE_CACHE_NAME);
    localStorage.removeItem(META_STORAGE_KEY);
    console.log('[ImageCache] Cache de imagens limpo');
  } catch (e) {
    console.warn('[ImageCache] Erro ao limpar cache:', e);
  }
}

/**
 * Obtém estatísticas do cache de imagens
 */
export async function getImageCacheStats(): Promise<{
  count: number;
  totalSize: number;
  oldestDate: Date | null;
}> {
  const meta = getImageMeta();
  
  let totalSize = 0;
  let oldestTimestamp = Date.now();
  
  for (const [, imageMeta] of meta) {
    totalSize += imageMeta.size || 0;
    if (imageMeta.cachedAt < oldestTimestamp) {
      oldestTimestamp = imageMeta.cachedAt;
    }
  }
  
  return {
    count: meta.size,
    totalSize,
    oldestDate: meta.size > 0 ? new Date(oldestTimestamp) : null
  };
}
