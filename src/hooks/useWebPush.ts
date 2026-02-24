import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Configuração VAPID para Web Push
 * Nota: A chave pública de exemplo - deve ser substituída por uma real em produção
 */
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

/**
 * Converte string base64 para Uint8Array (necessário para subscription)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook para gerenciar Web Push Notifications
 * Integrado para armazenar subscriptions (tabela será criada via migration)
 */
export function useWebPush() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar suporte e estado atual
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window &&
                       'Notification' in window;
      
      setIsSupported(supported);

      if (supported && user) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const pm = (registration as any).pushManager;
          if (!pm) return;
          const existingSubscription = await pm.getSubscription();
          
          if (existingSubscription) {
            setSubscription(existingSubscription);
            setIsSubscribed(true);
          }
        } catch (err) {
          console.warn('[WebPush] Erro ao verificar subscription:', err);
        }
      }
    };

    checkSupport();
  }, [user]);

  /**
   * Salva a subscription no servidor via localStorage (fallback até tabela existir)
   */
  const saveSubscriptionLocally = useCallback((sub: PushSubscription) => {
    if (!user) return;

    try {
      const key = `push_subscription_${user.id}`;
      localStorage.setItem(key, JSON.stringify({
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: sub.toJSON().keys,
      }));
      console.log('[WebPush] Subscription salva localmente');
    } catch (err) {
      console.warn('[WebPush] Erro ao salvar localmente:', err);
    }
  }, [user]);

  /**
   * Remove a subscription do armazenamento local
   */
  const removeSubscriptionLocally = useCallback(() => {
    if (!user) return;
    
    try {
      const key = `push_subscription_${user.id}`;
      localStorage.removeItem(key);
      console.log('[WebPush] Subscription removida localmente');
    } catch (err) {
      console.warn('[WebPush] Erro ao remover localmente:', err);
    }
  }, [user]);

  /**
   * Inscreve o usuário para receber push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      setError('Push notifications não suportadas');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Solicitar permissão de notificação
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setError('Permissão de notificação negada');
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Criar subscription com applicationServerKey tipado corretamente
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const pm = (registration as any).pushManager;
      if (!pm) throw new Error('PushManager não disponível');
      
      const newSubscription = await pm.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      setSubscription(newSubscription);
      setIsSubscribed(true);

      // Salvar localmente como fallback
      saveSubscriptionLocally(newSubscription);

      console.log('[WebPush] Usuário inscrito com sucesso');
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[WebPush] Erro ao inscrever:', err);
      setError('Erro ao ativar notificações');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, user, saveSubscriptionLocally]);

  /**
   * Cancela a inscrição de push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    setIsLoading(true);

    try {
      await subscription.unsubscribe();
      
      setSubscription(null);
      setIsSubscribed(false);

      // Remover do armazenamento local
      removeSubscriptionLocally();

      console.log('[WebPush] Usuário desinscrito com sucesso');
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[WebPush] Erro ao desinscrever:', err);
      setError('Erro ao desativar notificações');
      setIsLoading(false);
      return false;
    }
  }, [subscription, removeSubscriptionLocally]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    subscription,
  };
}
