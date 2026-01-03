/**
 * Cache offline usando IndexedDB para armazenar dados de anime entries
 * Permite visualização da lista mesmo sem conexão com internet
 */

// Configuração do banco de dados
const DB_NAME = 'anicheck-cache';
const DB_VERSION = 2; // Incrementado para adicionar store do catálogo

// Stores de cache
const STORES = {
  ANIME_ENTRIES: 'anime-entries',
  USER_STATS: 'user-stats',
  CUSTOM_LISTS: 'custom-lists',
  LAST_SYNC: 'last-sync',
  ANIME_CATALOG: 'anime-catalog', // Cache para dados do catálogo/Jikan
} as const;

/**
 * Interface para metadados de sincronização
 */
interface SyncMetadata {
  userId: string;
  lastSyncAt: number;
  dataType: string;
}

/**
 * Abre o banco de dados de cache
 */
function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store para anime entries
      if (!db.objectStoreNames.contains(STORES.ANIME_ENTRIES)) {
        const animeStore = db.createObjectStore(STORES.ANIME_ENTRIES, { keyPath: 'id' });
        animeStore.createIndex('user_id', 'user_id', { unique: false });
        animeStore.createIndex('mal_id', 'mal_id', { unique: false });
        animeStore.createIndex('status', 'status', { unique: false });
      }

      // Store para estatísticas do usuário
      if (!db.objectStoreNames.contains(STORES.USER_STATS)) {
        db.createObjectStore(STORES.USER_STATS, { keyPath: 'userId' });
      }

      // Store para listas customizadas
      if (!db.objectStoreNames.contains(STORES.CUSTOM_LISTS)) {
        const listsStore = db.createObjectStore(STORES.CUSTOM_LISTS, { keyPath: 'id' });
        listsStore.createIndex('user_id', 'user_id', { unique: false });
      }

      // Store para metadados de sincronização
      if (!db.objectStoreNames.contains(STORES.LAST_SYNC)) {
        db.createObjectStore(STORES.LAST_SYNC, { keyPath: 'dataType' });
      }

      // Store para cache do catálogo de animes (dados da API externa/Jikan)
      if (!db.objectStoreNames.contains(STORES.ANIME_CATALOG)) {
        const catalogStore = db.createObjectStore(STORES.ANIME_CATALOG, { keyPath: 'mal_id' });
        catalogStore.createIndex('cached_at', 'cached_at', { unique: false });
      }
    };
  });
}

/**
 * Salva anime entries no cache
 */
export async function cacheAnimeEntries(
  entries: Record<string, unknown>[],
  userId: string
): Promise<void> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ANIME_ENTRIES, STORES.LAST_SYNC], 'readwrite');
    const store = transaction.objectStore(STORES.ANIME_ENTRIES);
    const syncStore = transaction.objectStore(STORES.LAST_SYNC);

    // Primeiro, remove entries antigas do usuário
    const index = store.index('user_id');
    const deleteRequest = index.openCursor(IDBKeyRange.only(userId));

    deleteRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        // Após deletar, adiciona as novas entries
        entries.forEach((entry) => {
          store.put(entry);
        });

        // Atualiza metadados de sincronização
        syncStore.put({
          dataType: `anime-entries-${userId}`,
          userId,
          lastSyncAt: Date.now(),
        } as SyncMetadata);
      }
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Obtém anime entries do cache
 */
export async function getCachedAnimeEntries(
  userId: string,
  status?: string
): Promise<Record<string, unknown>[]> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ANIME_ENTRIES, 'readonly');
    const store = transaction.objectStore(STORES.ANIME_ENTRIES);
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      let entries = request.result || [];

      // Filtra por status se especificado
      if (status) {
        entries = entries.filter((entry) => entry.status === status);
      }

      // Filtra apenas não arquivados
      entries = entries.filter((entry) => !entry.is_archived);

      // Ordena por updated_at descendente
      entries.sort((a, b) => {
        const dateA = new Date(a.updated_at as string).getTime();
        const dateB = new Date(b.updated_at as string).getTime();
        return dateB - dateA;
      });

      resolve(entries);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Atualiza uma entrada específica no cache
 */
export async function updateCachedEntry(
  entryId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ANIME_ENTRIES, 'readwrite');
    const store = transaction.objectStore(STORES.ANIME_ENTRIES);
    const getRequest = store.get(entryId);

    getRequest.onsuccess = () => {
      const entry = getRequest.result;
      if (entry) {
        const updatedEntry = { ...entry, ...updates, updated_at: new Date().toISOString() };
        store.put(updatedEntry);
      }
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Adiciona uma nova entrada ao cache
 */
export async function addCachedEntry(entry: Record<string, unknown>): Promise<void> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ANIME_ENTRIES, 'readwrite');
    const store = transaction.objectStore(STORES.ANIME_ENTRIES);
    store.put(entry);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Remove uma entrada do cache
 */
export async function removeCachedEntry(entryId: string): Promise<void> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ANIME_ENTRIES, 'readwrite');
    const store = transaction.objectStore(STORES.ANIME_ENTRIES);
    store.delete(entryId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Salva estatísticas do usuário no cache
 */
export async function cacheUserStats(
  stats: Record<string, unknown>,
  userId: string
): Promise<void> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.USER_STATS, 'readwrite');
    const store = transaction.objectStore(STORES.USER_STATS);
    store.put({ ...stats, userId });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Obtém estatísticas do usuário do cache
 */
export async function getCachedUserStats(
  userId: string
): Promise<Record<string, unknown> | null> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.USER_STATS, 'readonly');
    const store = transaction.objectStore(STORES.USER_STATS);
    const request = store.get(userId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Obtém a última data de sincronização
 */
export async function getLastSyncTime(userId: string): Promise<number | null> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.LAST_SYNC, 'readonly');
    const store = transaction.objectStore(STORES.LAST_SYNC);
    const request = store.get(`anime-entries-${userId}`);

    request.onsuccess = () => {
      const result = request.result as SyncMetadata | undefined;
      resolve(result?.lastSyncAt || null);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Limpa todo o cache de um usuário
 */
export async function clearUserCache(userId: string): Promise<void> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.ANIME_ENTRIES, STORES.USER_STATS, STORES.LAST_SYNC],
      'readwrite'
    );

    // Remove anime entries
    const entriesStore = transaction.objectStore(STORES.ANIME_ENTRIES);
    const entriesIndex = entriesStore.index('user_id');
    const deleteEntriesRequest = entriesIndex.openCursor(IDBKeyRange.only(userId));

    deleteEntriesRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Remove user stats
    const statsStore = transaction.objectStore(STORES.USER_STATS);
    statsStore.delete(userId);

    // Remove sync metadata
    const syncStore = transaction.objectStore(STORES.LAST_SYNC);
    syncStore.delete(`anime-entries-${userId}`);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Verifica se o cache está disponível e não está muito antigo
 */
export async function isCacheValid(userId: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<boolean> {
  const lastSync = await getLastSyncTime(userId);
  if (!lastSync) return false;
  return Date.now() - lastSync < maxAgeMs;
}

// ========================================
// Cache do Catálogo de Animes (Jikan/API)
// ========================================

interface CachedCatalogAnime {
  mal_id: number;
  data: Record<string, unknown>;
  source: 'catalog' | 'jikan';
  cached_at: number;
}

// TTL padrão: 7 dias para dados do catálogo
const CATALOG_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Salva dados de anime do catálogo no cache IndexedDB
 */
export async function cacheCatalogAnime(
  malId: number,
  data: Record<string, unknown>,
  source: 'catalog' | 'jikan'
): Promise<void> {
  try {
    const db = await openCacheDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ANIME_CATALOG, 'readwrite');
      const store = transaction.objectStore(STORES.ANIME_CATALOG);
      
      store.put({
        mal_id: malId,
        data,
        source,
        cached_at: Date.now(),
      } as CachedCatalogAnime);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.warn('[CatalogCache] Erro ao salvar no cache:', error);
  }
}

/**
 * Obtém dados de anime do cache IndexedDB
 * Retorna null se não encontrado ou expirado
 */
export async function getCachedCatalogAnime(
  malId: number,
  maxAgeMs = CATALOG_CACHE_TTL
): Promise<{ data: Record<string, unknown>; source: 'catalog' | 'jikan' } | null> {
  try {
    const db = await openCacheDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ANIME_CATALOG, 'readonly');
      const store = transaction.objectStore(STORES.ANIME_CATALOG);
      const request = store.get(malId);

      request.onsuccess = () => {
        const result = request.result as CachedCatalogAnime | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Verifica se o cache expirou
        if (Date.now() - result.cached_at > maxAgeMs) {
          resolve(null);
          return;
        }

        resolve({ data: result.data, source: result.source });
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[CatalogCache] Erro ao ler do cache:', error);
    return null;
  }
}

/**
 * Limpa entradas expiradas do cache do catálogo
 */
export async function cleanExpiredCatalogCache(maxAgeMs = CATALOG_CACHE_TTL): Promise<number> {
  try {
    const db = await openCacheDB();
    const cutoffTime = Date.now() - maxAgeMs;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ANIME_CATALOG, 'readwrite');
      const store = transaction.objectStore(STORES.ANIME_CATALOG);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value as CachedCatalogAnime;
          if (entry.cached_at < cutoffTime) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        db.close();
        console.log(`[CatalogCache] ${deletedCount} entradas expiradas removidas`);
        resolve(deletedCount);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.warn('[CatalogCache] Erro ao limpar cache expirado:', error);
    return 0;
  }
}

/**
 * Obtém estatísticas do cache do catálogo
 */
export async function getCatalogCacheStats(): Promise<{
  totalEntries: number;
  catalogCount: number;
  jikanCount: number;
  oldestEntry: number | null;
}> {
  try {
    const db = await openCacheDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ANIME_CATALOG, 'readonly');
      const store = transaction.objectStore(STORES.ANIME_CATALOG);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CachedCatalogAnime[];
        const catalogCount = entries.filter(e => e.source === 'catalog').length;
        const jikanCount = entries.filter(e => e.source === 'jikan').length;
        const oldestEntry = entries.length > 0 
          ? Math.min(...entries.map(e => e.cached_at))
          : null;

        resolve({
          totalEntries: entries.length,
          catalogCount,
          jikanCount,
          oldestEntry,
        });
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[CatalogCache] Erro ao obter estatísticas:', error);
    return { totalEntries: 0, catalogCount: 0, jikanCount: 0, oldestEntry: null };
  }
}
