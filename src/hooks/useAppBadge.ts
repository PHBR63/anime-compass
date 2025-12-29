import { useEffect, useCallback, useState } from 'react';
import { useUnreadNotificationsCount } from './useNotifications';

/**
 * Hook para gerenciar o badge do app (Badging API)
 * Mostra número de notificações não lidas no ícone do app
 */
export function useAppBadge() {
  const [isSupported, setIsSupported] = useState(false);
  const unreadCount = useUnreadNotificationsCount();

  // Verificar suporte à Badging API
  useEffect(() => {
    setIsSupported('setAppBadge' in navigator && 'clearAppBadge' in navigator);
  }, []);

  /**
   * Define o badge com um número específico
   */
  const setBadge = useCallback(async (count: number): Promise<boolean> => {
    if (!isSupported) {
      console.log('[AppBadge] API não suportada');
      return false;
    }

    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
      return true;
    } catch (error) {
      console.warn('[AppBadge] Erro ao definir badge:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Limpa o badge
   */
  const clearBadge = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      await navigator.clearAppBadge();
      return true;
    } catch (error) {
      console.warn('[AppBadge] Erro ao limpar badge:', error);
      return false;
    }
  }, [isSupported]);

  // Atualizar badge automaticamente quando contagem de notificações mudar
  useEffect(() => {
    if (isSupported && unreadCount !== undefined) {
      setBadge(unreadCount);
    }
  }, [isSupported, unreadCount, setBadge]);

  return {
    isSupported,
    setBadge,
    clearBadge,
    currentCount: unreadCount || 0,
  };
}
