/**
 * Cache offline usando IndexedDB para armazenar dados de anime entries
 * Permite visualização da lista mesmo sem conexão com internet
 */

// Configuração do banco de dados
const DB_NAME = 'anicheck-cache';
const DB_VERSION = 1;

// Stores de cache
const STORES = {
  ANIME_ENTRIES: 'anime-entries',
  USER_STATS: 'user-stats',
  CUSTOM_LISTS: 'custom-lists',
  LAST_SYNC: 'last-sync',
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
