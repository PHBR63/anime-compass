import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listenToNotificationClicks } from '@/lib/serviceWorkerMessaging';

/**
 * Componente que escuta cliques em notificações do Service Worker
 * e navega para a página apropriada
 */
export function NotificationClickHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Escuta cliques em notificações do Service Worker
    const cleanup = listenToNotificationClicks(({ targetUrl }) => {
      if (targetUrl && targetUrl !== window.location.pathname) {
        navigate(targetUrl);
      }
    });

    return cleanup;
  }, [navigate]);

  // Este componente não renderiza nada
  return null;
}
