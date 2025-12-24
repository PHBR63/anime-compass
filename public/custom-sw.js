/**
 * Service Worker customizado para push notifications e auto-update
 * Este arquivo é injetado pelo Vite PWA plugin junto com o SW gerado pelo Workbox
 * 
 * Funcionalidades:
 * - Push notifications em background
 * - Comunicação com o cliente para auto-update
 * - Limpeza de caches antigos
 */

// Versão do SW para controle de atualizações
const SW_VERSION = '1.2.0';

// Flag para evitar múltiplas ativações
let isActivating = false;

/**
 * Evento de instalação - nova versão do SW sendo instalada
 */
self.addEventListener('install', (event) => {
  console.log(`[SW v${SW_VERSION}] Nova versão instalada`);
  // skipWaiting é controlado pelo Workbox config
});

/**
 * Evento de ativação - SW assumindo controle
 */
self.addEventListener('activate', (event) => {
  // Prevenir múltiplas ativações simultâneas
  if (isActivating) {
    console.log('[SW] Ativação já em andamento, ignorando...');
    return;
  }
  
  isActivating = true;
  console.log(`[SW v${SW_VERSION}] Ativado!`);
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos (exceto os atuais do Workbox)
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
    ])
      .then(() => {
        // Notificar todos os clientes que o SW foi atualizado
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: SW_VERSION,
            });
          });
        });
      })
      .finally(() => {
        isActivating = false;
      })
  );
});

/**
 * Escuta mensagens do cliente
 */
self.addEventListener('message', (event) => {
  const { type, ...data } = event.data || {};

  switch (type) {
    // Comando para pular espera e ativar imediatamente
    case 'SKIP_WAITING':
      console.log('[SW] Recebido comando SKIP_WAITING');
      self.skipWaiting();
      break;

    // Comando para exibir notificação
    case 'SHOW_NOTIFICATION':
      const { title, options } = data;
      self.registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [100, 50, 100],
        requireInteraction: false,
        ...options,
      });
      break;

    // Retornar versão do SW
    case 'GET_VERSION':
      event.ports?.[0]?.postMessage({ 
        version: SW_VERSION, 
        updated: true 
      });
      break;

    // Verificar se há atualizações
    case 'CHECK_UPDATE':
      self.registration.update().then(() => {
        event.ports?.[0]?.postMessage({ 
          checked: true 
        });
      }).catch((err) => {
        console.warn('[SW] Erro ao verificar update:', err);
        event.ports?.[0]?.postMessage({ 
          checked: false, 
          error: err.message 
        });
      });
      break;

    default:
      console.log('[SW] Mensagem desconhecida:', type);
  }
});

/**
 * Clique na notificação - abre o app ou foca na janela existente
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  let targetUrl = '/';
  
  // Determina URL baseado no tipo de notificação
  switch (notificationData.type) {
    case 'friend_request':
    case 'friend_accepted':
      targetUrl = '/social';
      break;
    case 'achievement':
      targetUrl = '/achievements';
      break;
    case 'review_like':
      targetUrl = '/reviews';
      break;
    case 'chat_message':
      targetUrl = '/chat';
      break;
    default:
      if (notificationData.anime_id) {
        targetUrl = '/my-list';
      }
  }
  
  // Tenta focar janela existente ou abre nova
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Procura por uma janela existente do app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Notificar o cliente sobre o clique
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData,
            targetUrl,
          });
          return client.focus();
        }
      }
      // Se não encontrou, abre nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Ação de fechar notificação
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});

/**
 * Push events (para push notifications server-side)
 */
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

/**
 * Background Sync (para sincronizar dados quando reconectar)
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-anime-entries') {
    event.waitUntil(
      // Notificar clientes para sincronizar
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            tag: event.tag,
          });
        });
      })
    );
  }
});

console.log(`[SW v${SW_VERSION}] Service Worker carregado`);
