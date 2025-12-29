import { useEffect, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Tags de sincronização disponíveis
 */
export const SYNC_TAGS = {
  ANIME_ENTRIES: 'sync-anime-entries',
  REVIEWS: 'sync-reviews',
  NOTIFICATIONS: 'sync-notifications',
} as const;

/**
 * Tags de sincronização periódica
 */
export const PERIODIC_SYNC_TAGS = {
  CHECK_UPDATES: 'check-updates',
  SYNC_DATA: 'periodic-sync-data',
} as const;

type SyncTag = typeof SYNC_TAGS[keyof typeof SYNC_TAGS];
type PeriodicSyncTag = typeof PERIODIC_SYNC_TAGS[keyof typeof PERIODIC_SYNC_TAGS];

/**
 * Interface para status do Background Sync
 */
interface BackgroundSyncStatus {
  isSupported: boolean;
  periodicSyncSupported: boolean;
  registeredTags: string[];
}

/**
 * Hook para gerenciar Background Sync API
 * Permite registrar sincronizações para quando o dispositivo reconectar
 */
export function useBackgroundSync() {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [status, setStatus] = useState<BackgroundSyncStatus>({
    isSupported: false,
    periodicSyncSupported: false,
    registeredTags: [],
  });

  // Verificar suporte à Background Sync API
  useEffect(() => {
    const checkSupport = async () => {
      const swSupport = 'serviceWorker' in navigator;
      const syncSupport = swSupport && 'SyncManager' in window;
      const periodicSupport = swSupport && 'PeriodicSyncManager' in window;

      setStatus((prev) => ({
        ...prev,
        isSupported: syncSupport,
        periodicSyncSupported: periodicSupport,
      }));
    };

    checkSupport();
  }, []);

  /**
   * Registra uma sincronização para quando reconectar
   */
  const registerSync = useCallback(async (tag: SyncTag): Promise<boolean> => {
    if (!status.isSupported) {
      console.warn('[BackgroundSync] API não suportada neste navegador');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // @ts-expect-error - SyncManager não está no tipo padrão
      await registration.sync.register(tag);
      
      console.log(`[BackgroundSync] Sync registrado: ${tag}`);
      
      setStatus((prev) => ({
        ...prev,
        registeredTags: [...new Set([...prev.registeredTags, tag])],
      }));
      
      return true;
    } catch (error) {
      console.error('[BackgroundSync] Erro ao registrar sync:', error);
      return false;
    }
  }, [status.isSupported]);

  /**
   * Registra sincronização periódica (requer PWA instalado)
   */
  const registerPeriodicSync = useCallback(async (
    tag: PeriodicSyncTag,
    minInterval: number = 24 * 60 * 60 * 1000 // 24 horas por padrão
  ): Promise<boolean> => {
    if (!status.periodicSyncSupported) {
      console.warn('[BackgroundSync] Periodic Sync não suportado');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar permissão
      const permissionStatus = await navigator.permissions.query({
        // @ts-expect-error - periodic-background-sync não está no tipo
        name: 'periodic-background-sync',
      });

      if (permissionStatus.state !== 'granted') {
        console.warn('[BackgroundSync] Permissão de periodic sync negada');
        return false;
      }

      // @ts-expect-error - periodicSync não está no tipo padrão
      await registration.periodicSync.register(tag, {
        minInterval,
      });
      
      console.log(`[BackgroundSync] Periodic sync registrado: ${tag}`);
      return true;
    } catch (error) {
      console.error('[BackgroundSync] Erro ao registrar periodic sync:', error);
      return false;
    }
  }, [status.periodicSyncSupported]);

  /**
   * Remove um registro de sincronização periódica
   */
  const unregisterPeriodicSync = useCallback(async (tag: PeriodicSyncTag): Promise<boolean> => {
    if (!status.periodicSyncSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // @ts-expect-error - periodicSync não está no tipo padrão
      await registration.periodicSync.unregister(tag);
      
      console.log(`[BackgroundSync] Periodic sync removido: ${tag}`);
      return true;
    } catch (error) {
      console.error('[BackgroundSync] Erro ao remover periodic sync:', error);
      return false;
    }
  }, [status.periodicSyncSupported]);

  /**
   * Registra sync de anime entries quando ficar offline
   */
  const registerAnimeSync = useCallback(async () => {
    if (!isOnline && user) {
      return registerSync(SYNC_TAGS.ANIME_ENTRIES);
    }
    return false;
  }, [isOnline, user, registerSync]);

  // Escutar mensagens do Service Worker sobre sync
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, tag } = event.data || {};

      if (type === 'BACKGROUND_SYNC') {
        console.log('[BackgroundSync] Sync executado pelo SW:', tag);
        
        // Remover da lista de registrados
        setStatus((prev) => ({
          ...prev,
          registeredTags: prev.registeredTags.filter((t) => t !== tag),
        }));

        // Disparar evento customizado para outros hooks escutarem
        window.dispatchEvent(
          new CustomEvent('background-sync-triggered', { detail: { tag } })
        );
      }

      if (type === 'PERIODIC_SYNC') {
        console.log('[BackgroundSync] Periodic sync executado:', tag);
        window.dispatchEvent(
          new CustomEvent('periodic-sync-triggered', { detail: { tag } })
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Tentar registrar periodic sync quando usuário logar
  useEffect(() => {
    if (user && status.periodicSyncSupported) {
      // Registrar verificação de updates a cada 12 horas
      registerPeriodicSync(PERIODIC_SYNC_TAGS.CHECK_UPDATES, 12 * 60 * 60 * 1000);
      // Registrar sync de dados a cada 6 horas
      registerPeriodicSync(PERIODIC_SYNC_TAGS.SYNC_DATA, 6 * 60 * 60 * 1000);
    }
  }, [user, status.periodicSyncSupported, registerPeriodicSync]);

  return {
    ...status,
    registerSync,
    registerPeriodicSync,
    unregisterPeriodicSync,
    registerAnimeSync,
    SYNC_TAGS,
    PERIODIC_SYNC_TAGS,
  };
}
