/**
 * Utilitários para comunicação com o Service Worker
 * Permite enviar notificações via SW para funcionar em background
 */

/**
 * Verifica se o Service Worker está disponível e ativo
 */
export function isServiceWorkerReady(): boolean {
  return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
}

/**
 * Obtém o Service Worker ativo
 */
export async function getActiveServiceWorker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  // Primeiro tenta o controller
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  // Se não tem controller, espera o registro ficar pronto
  const registration = await navigator.serviceWorker.ready;
  return registration.active;
}

/**
 * Envia uma notificação através do Service Worker
 * Isso permite que a notificação apareça mesmo com a aba em background
 */
export async function sendNotificationViaSW(
  title: string,
  options?: NotificationOptions & { data?: Record<string, unknown> }
): Promise<boolean> {
  const sw = await getActiveServiceWorker();
  
  if (!sw) {
    console.warn('[SW Messaging] Service Worker não disponível');
    return false;
  }

  try {
    sw.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      options: {
        ...options,
        data: {
          ...options?.data,
          timestamp: Date.now(),
        },
      },
    });
    return true;
  } catch (error) {
    console.error('[SW Messaging] Erro ao enviar notificação:', error);
    return false;
  }
}

/**
 * Escuta cliques em notificações do Service Worker
 */
export function listenToNotificationClicks(
  callback: (data: { targetUrl: string; data: Record<string, unknown> }) => void
): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
      callback({
        targetUrl: event.data.targetUrl,
        data: event.data.data,
      });
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

/**
 * Registra o Service Worker customizado
 */
export async function registerCustomSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker não suportado');
    return null;
  }

  try {
    // O Vite PWA já registra o SW principal, só precisamos garantir que está pronto
    const registration = await navigator.serviceWorker.ready;
    console.log('[SW] Service Worker pronto:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[SW] Erro ao registrar Service Worker:', error);
    return null;
  }
}
