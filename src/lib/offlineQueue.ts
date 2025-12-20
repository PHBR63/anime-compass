/**
 * Fila de operações offline para sincronização quando voltar online
 * Armazena operações no IndexedDB para persistência
 */

// Nome do banco de dados e store
const DB_NAME = 'anicheck-offline';
const STORE_NAME = 'pending-operations';
const DB_VERSION = 1;

// Tipos de operações suportadas
export type OperationType = 
  | 'add-anime' 
  | 'update-anime' 
  | 'delete-anime'
  | 'update-progress'
  | 'toggle-favorite'
  | 'add-review'
  | 'update-review';

// Estrutura de uma operação pendente
export interface PendingOperation {
  id: string;
  type: OperationType;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  userId: string;
}

// Abre o banco de dados IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

// Gera um ID único para operações
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Adiciona uma operação à fila offline
 */
export async function addToQueue(
  type: OperationType,
  data: Record<string, unknown>,
  userId: string
): Promise<string> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const operation: PendingOperation = {
      id: generateId(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      userId,
    };
    
    const request = store.add(operation);
    
    request.onsuccess = () => {
      resolve(operation.id);
      // Dispara evento para notificar que há operações pendentes
      window.dispatchEvent(new CustomEvent('offline-queue-updated'));
    };
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Obtém todas as operações pendentes de um usuário
 */
export async function getPendingOperations(userId: string): Promise<PendingOperation[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.getAll(userId);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Obtém o número de operações pendentes
 */
export async function getPendingCount(userId: string): Promise<number> {
  const operations = await getPendingOperations(userId);
  return operations.length;
}

/**
 * Remove uma operação da fila (após sincronização bem-sucedida)
 */
export async function removeFromQueue(operationId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(operationId);
    
    request.onsuccess = () => {
      resolve();
      window.dispatchEvent(new CustomEvent('offline-queue-updated'));
    };
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Incrementa o contador de tentativas de uma operação
 */
export async function incrementRetryCount(operationId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(operationId);
    
    getRequest.onsuccess = () => {
      const operation = getRequest.result;
      if (operation) {
        operation.retryCount += 1;
        store.put(operation);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Limpa operações com muitas tentativas falhas (máximo 5)
 */
export async function clearFailedOperations(userId: string): Promise<number> {
  const operations = await getPendingOperations(userId);
  const failedOps = operations.filter(op => op.retryCount >= 5);
  
  for (const op of failedOps) {
    await removeFromQueue(op.id);
  }
  
  return failedOps.length;
}

/**
 * Limpa todas as operações pendentes de um usuário
 */
export async function clearAllOperations(userId: string): Promise<void> {
  const operations = await getPendingOperations(userId);
  
  for (const op of operations) {
    await removeFromQueue(op.id);
  }
}
