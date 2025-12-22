import { useEffect, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Hook para gerenciar atualizações automáticas do PWA
 * Detecta novas versões e aplica automaticamente
 */
export function usePWAUpdate() {
  // Estado para controlar se uma atualização foi aplicada recentemente
  const [updateApplied, setUpdateApplied] = useState(false);
  // Estado para controlar se está verificando atualização
  const [isChecking, setIsChecking] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Verificar atualizações periodicamente (a cada 60 segundos)
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Verificação periódica de atualizações
        setInterval(() => {
          registration.update();
        }, 60 * 1000); // 60 segundos
      }
    },
    // Callback quando uma atualização está pronta
    onNeedRefresh() {
      console.log('[PWA] Nova versão disponível, atualizando automaticamente...');
    },
    // Callback quando o app está pronto para uso offline
    onOfflineReady() {
      console.log('[PWA] App pronto para uso offline');
    },
    // Callback de erro no registro
    onRegisterError(error) {
      console.error('[PWA] Erro ao registrar Service Worker:', error);
    },
  });

  /**
   * Aplica a atualização automaticamente quando detectada
   */
  useEffect(() => {
    if (needRefresh) {
      // Aplicar atualização automaticamente com reload
      updateServiceWorker(true)
        .then(() => {
          setUpdateApplied(true);
          // Resetar flag após mostrar notificação
          setTimeout(() => setUpdateApplied(false), 5000);
        })
        .catch((err) => {
          console.error('[PWA] Erro ao aplicar atualização:', err);
        });
    }
  }, [needRefresh, updateServiceWorker]);

  /**
   * Força verificação manual de atualização
   */
  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      console.error('[PWA] Erro ao verificar atualizações:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Fechar notificação de offline ready
   */
  const closeOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, [setOfflineReady]);

  /**
   * Fechar notificação de need refresh (caso queira manual)
   */
  const closeNeedRefresh = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  return {
    // Estados
    offlineReady,
    needRefresh,
    updateApplied,
    isChecking,
    // Ações
    checkForUpdate,
    closeOfflineReady,
    closeNeedRefresh,
    updateServiceWorker,
  };
}
