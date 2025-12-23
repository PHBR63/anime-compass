/**
 * Service Worker customizado para push notifications em background
 * Este arquivo é injetado pelo Vite PWA plugin junto com o SW gerado pelo Workbox
 * 
 * IMPORTANTE: skipWaiting é controlado pelo Workbox config, não aqui
 */

// Flag para evitar múltiplas ativações
let isActivating = false;

// Evento de instalação - NÃO chamar skipWaiting aqui (já é feito pelo Workbox)
self.addEventListener('install', (event) => {
  console.log('[SW] Nova versão instalada');
  // Deixar o Workbox controlar o skipWaiting via config
});

// Assume controle de todas as páginas quando ativado
self.addEventListener('activate', (event) => {
  // Prevenir múltiplas ativações simultâneas
  if (isActivating) {
    console.log('[SW] Ativação já em andamento, ignorando...');
    return;
  }
  
  isActivating = true;
  console.log('[SW] Nova versão ativada!');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos (exceto os atuais)
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Manter apenas caches atuais do Workbox
              return cacheName.startsWith('workbox-') && 
                     !cacheName.includes('precache') && 
                     !cacheName.includes('runtime');
            })
            .map((cacheName) => {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Assumir controle de todos os clientes
      self.clients.claim(),
    ]).finally(() => {
      isActivating = false;
    })
  );
});

// Escuta mensagens do cliente
self.addEventListener('message', (event) => {
  // Comando para pular espera e ativar imediatamente
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recebido comando SKIP_WAITING');
    self.skipWaiting();
    return;
  }
  
  // Comando para exibir notificação
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    // Exibe a notificação
    self.registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      ...options,
    });
  }

  // Notificar cliente sobre versão
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({ version: '1.0.0', updated: true });
  }
});

// Clique na notificação - abre o app ou foca na janela existente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  let targetUrl = '/';
  
  // Determina URL baseado no tipo de notificação
  if (notificationData.type === 'friend_request' || notificationData.type === 'friend_accepted') {
    targetUrl = '/social';
  } else if (notificationData.type === 'achievement') {
    targetUrl = '/achievements';
  } else if (notificationData.type === 'review_like') {
    targetUrl = '/reviews';
  } else if (notificationData.anime_id) {
    targetUrl = '/my-list';
  }
  
  // Tenta focar janela existente ou abre nova
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Procura por uma janela existente do app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData,
            targetUrl,
          });
          return client.focus();
        }
      }
      // Se não encontrou, abre nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Ação de fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});

// Push events (para quando implementar push server-side)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || data.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      tag: data.tag || 'anicheck-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'AniCheck', options)
    );
  } catch (error) {
    console.error('[SW] Erro ao processar push:', error);
  }
});
