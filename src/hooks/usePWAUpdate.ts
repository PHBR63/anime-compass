import { useEffect, useState, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Chave para controle de atualização no sessionStorage
 */
const UPDATE_APPLIED_KEY = 'pwa-update-applied';
const UPDATE_CHECK_KEY = 'pwa-last-update-check';

/**
 * Hook para gerenciar atualizações do PWA
 * Corrigido para evitar loops de refresh
 */
export function usePWAUpdate() {
  // Estado para controlar se uma atualização foi aplicada recentemente
  const [updateApplied, setUpdateApplied] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(UPDATE_APPLIED_KEY) === 'true';
    }
    return false;
  });
  
  // Estado para controlar se está verificando atualização
  const [isChecking, setIsChecking] = useState(false);
  
  // Ref para evitar múltiplas atualizações simultâneas
  const isUpdatingRef = useRef(false);
  
  // Ref para o intervalo de verificação
  const checkIntervalRef = useRef<number | null>(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Callback quando SW é registrado
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registrado:', swUrl);
      
      if (registration) {
        // Verificação periódica de atualizações (a cada 5 minutos)
        // Limpar intervalo anterior se existir
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        
        checkIntervalRef.current = window.setInterval(() => {
          // Verificar se já verificou recentemente (nos últimos 2 minutos)
          const lastCheck = sessionStorage.getItem(UPDATE_CHECK_KEY);
          const now = Date.now();
          
          if (lastCheck && now - parseInt(lastCheck) < 2 * 60 * 1000) {
            console.log('[PWA] Verificação de update pulada (muito recente)');
            return;
          }
          
          console.log('[PWA] Verificando atualizações...');
          sessionStorage.setItem(UPDATE_CHECK_KEY, now.toString());
          registration.update().catch((err) => {
            console.warn('[PWA] Erro ao verificar atualizações:', err);
          });
        }, 5 * 60 * 1000); // 5 minutos
      }
    },
    // Callback quando uma atualização está pronta
    onNeedRefresh() {
      console.log('[PWA] Nova versão disponível');
      // NÃO fazer reload automático - deixar o usuário decidir
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
   * Limpar intervalo quando o componente desmontar
   */
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  /**
   * Limpar flag de update aplicado após alguns segundos
   */
  useEffect(() => {
    if (updateApplied) {
      const timer = setTimeout(() => {
        setUpdateApplied(false);
        sessionStorage.removeItem(UPDATE_APPLIED_KEY);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [updateApplied]);

  /**
   * Aplica a atualização manualmente (com controle anti-loop)
   */
  const applyUpdate = useCallback(async (reload: boolean = false) => {
    // Prevenir múltiplas atualizações simultâneas
    if (isUpdatingRef.current) {
      console.log('[PWA] Atualização já em andamento, ignorando...');
      return;
    }
    
    // Verificar se já foi aplicado recentemente
    if (sessionStorage.getItem(UPDATE_APPLIED_KEY) === 'true') {
      console.log('[PWA] Update já aplicado nesta sessão');
      return;
    }
    
    isUpdatingRef.current = true;
    
    try {
      console.log('[PWA] Aplicando atualização...');
      
      // Marcar como aplicado ANTES de chamar updateServiceWorker
      sessionStorage.setItem(UPDATE_APPLIED_KEY, 'true');
      setUpdateApplied(true);
      
      // Aplicar atualização (sem reload automático por padrão)
      await updateServiceWorker(reload);
      
      console.log('[PWA] Atualização aplicada com sucesso');
    } catch (err) {
      console.error('[PWA] Erro ao aplicar atualização:', err);
      sessionStorage.removeItem(UPDATE_APPLIED_KEY);
      setUpdateApplied(false);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [updateServiceWorker]);

  /**
   * Força verificação manual de atualização
   */
  const checkForUpdate = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        sessionStorage.setItem(UPDATE_CHECK_KEY, Date.now().toString());
        await registration.update();
        console.log('[PWA] Verificação manual concluída');
      }
    } catch (error) {
      console.error('[PWA] Erro ao verificar atualizações:', error);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  /**
   * Fechar notificação de offline ready
   */
  const closeOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, [setOfflineReady]);

  /**
   * Fechar notificação de need refresh
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
    applyUpdate,
    checkForUpdate,
    closeOfflineReady,
    closeNeedRefresh,
    updateServiceWorker,
  };
}
