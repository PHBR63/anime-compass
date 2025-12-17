/**
 * Sistema de Cache Persistente para API Jikan
 * Utiliza localStorage para persistir dados entre sessões
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  prefix: string;
  defaultTTL: number; // em milissegundos
  maxItems: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  prefix: 'jikan_cache_',
  defaultTTL: 1000 * 60 * 60, // 1 hora padrão
  maxItems: 100, // máximo de itens em cache
};

// TTLs específicos por tipo de dado
export const CACHE_TTL = {
  ANIME_DETAILS: 1000 * 60 * 60 * 24, // 24 horas para detalhes (raramente mudam)
  TOP_ANIMES: 1000 * 60 * 60 * 6, // 6 horas para top animes
  SEASON_ANIMES: 1000 * 60 * 60 * 2, // 2 horas para temporada atual
  SEARCH_RESULTS: 1000 * 60 * 30, // 30 minutos para buscas
  GENRE_RESULTS: 1000 * 60 * 60 * 4, // 4 horas para resultados por gênero
};

class JikanCache {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheItem<unknown>> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
    this.cleanup();
  }

  /**
   * Gera chave de cache com prefixo
   */
  private getKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * Carrega cache do localStorage para memória
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith(this.config.prefix)
      );

      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const item = JSON.parse(raw) as CacheItem<unknown>;
          this.memoryCache.set(key, item);
        }
      }

      console.log(`[JikanCache] Carregados ${keys.length} itens do storage`);
    } catch (error) {
      console.warn('[JikanCache] Erro ao carregar cache:', error);
    }
  }

  /**
   * Salva item no cache (memória + storage)
   */
  set<T>(key: string, data: T, ttl: number = this.config.defaultTTL): void {
    const fullKey = this.getKey(key);
    const now = Date.now();
    
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    // Salva em memória
    this.memoryCache.set(fullKey, item);

    // Salva em localStorage
    try {
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      // Storage cheio - limpar itens antigos
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.evictOldest(10);
        try {
          localStorage.setItem(fullKey, JSON.stringify(item));
        } catch {
          console.warn('[JikanCache] Storage cheio, usando apenas memória');
        }
      }
    }
  }

  /**
   * Busca item do cache
   */
  get<T>(key: string): T | null {
    const fullKey = this.getKey(key);
    const item = this.memoryCache.get(fullKey) as CacheItem<T> | undefined;

    if (!item) return null;

    // Verifica expiração
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Verifica se item existe e não expirou
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove item do cache
   */
  delete(key: string): void {
    const fullKey = this.getKey(key);
    this.memoryCache.delete(fullKey);
    
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // Ignora erros de storage
    }
  }

  /**
   * Limpa itens expirados
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiresAt) {
        this.memoryCache.delete(key);
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignora
        }
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[JikanCache] Removidos ${removed} itens expirados`);
    }
  }

  /**
   * Remove os itens mais antigos
   */
  private evictOldest(count: number): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, count);

    for (const [key] of entries) {
      this.memoryCache.delete(key);
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignora
      }
    }

    console.log(`[JikanCache] Evicted ${entries.length} itens antigos`);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    for (const key of this.memoryCache.keys()) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignora
      }
    }
    this.memoryCache.clear();
    console.log('[JikanCache] Cache limpo');
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): { items: number; memorySize: number } {
    return {
      items: this.memoryCache.size,
      memorySize: JSON.stringify(Array.from(this.memoryCache.entries())).length,
    };
  }
}

// Instância singleton do cache
export const jikanCache = new JikanCache();

/**
 * Helper para gerar chaves de cache consistentes
 */
export const cacheKeys = {
  animeDetails: (malId: number) => `anime_${malId}`,
  topAnimes: (page: number) => `top_page_${page}`,
  seasonAnimes: (page: number) => `season_page_${page}`,
  searchResults: (query: string, page: number) => `search_${query}_page_${page}`,
  genreResults: (genreId: number, page: number) => `genre_${genreId}_page_${page}`,
};
