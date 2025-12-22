import { useState, useEffect, useCallback } from 'react';
import { sendNotificationViaSW, isServiceWorkerReady, listenToNotificationClicks } from '@/lib/serviceWorkerMessaging';
import { useNavigate } from 'react-router-dom';

/**
 * Verifica se o horário atual está dentro do período de "não perturbe"
 */
export function isInDoNotDisturbPeriod(
  enabled: boolean,
  startTime?: string,
  endTime?: string
): boolean {
  if (!enabled || !startTime || !endTime) return false;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Converte horário string (HH:MM:SS ou HH:MM) para minutos
  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  
  // Se o período cruza a meia-noite (ex: 22:00 às 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  // Período normal (ex: 09:00 às 17:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Hook para gerenciar notificações push do navegador
 * Suporta notificações via Service Worker para funcionar em background
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [swReady, setSwReady] = useState(false);
  
  // Tentar usar navigate se disponível (dentro de Router)
  let navigate: ((path: string) => void) | null = null;
  try {
    navigate = useNavigate();
  } catch {
    // Não está dentro de um Router, ignore
  }

  // Verificar suporte e permissão atual
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
    
    // Verificar se SW está pronto
    setSwReady(isServiceWorkerReady());
  }, []);

  // Escutar cliques em notificações do SW
  useEffect(() => {
    const cleanup = listenToNotificationClicks(({ targetUrl }) => {
      if (navigate) {
        navigate(targetUrl);
      }
    });
    
    return cleanup;
  }, [navigate]);

  // Solicitar permissão do usuário
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.log('[usePushNotifications] Notificações não suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('[usePushNotifications] Erro ao solicitar permissão:', error);
      return false;
    }
  }, [isSupported]);

  // Enviar notificação (recebe parâmetros de "não perturbe" opcionalmente)
  const sendNotification = useCallback(async (
    title: string, 
    options?: NotificationOptions & { data?: Record<string, unknown> },
    doNotDisturb?: { enabled: boolean; start?: string; end?: string }
  ): Promise<Notification | null> => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    // Não enviar notificação se a janela está em foco
    if (document.hasFocus()) {
      return null;
    }

    // Respeita modo "não perturbe" se fornecido
    if (doNotDisturb && isInDoNotDisturbPeriod(doNotDisturb.enabled, doNotDisturb.start, doNotDisturb.end)) {
      console.log('[usePushNotifications] Notificação silenciada (modo não perturbe ativo)');
      return null;
    }

    // Tentar enviar via Service Worker primeiro (funciona em background)
    if (swReady) {
      const sent = await sendNotificationViaSW(title, options);
      if (sent) {
        console.log('[usePushNotifications] Notificação enviada via SW');
        return null; // Retorna null pois o SW gerencia a notificação
      }
    }

    // Fallback: notificação direta (só funciona com aba visível)
    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        ...options,
      });

      // Fechar notificação após 5 segundos
      setTimeout(() => notification.close(), 5000);

      // Focar janela ao clicar
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('[usePushNotifications] Erro ao enviar notificação:', error);
      return null;
    }
  }, [isSupported, permission, swReady]);
  // Enviar notificação de nova mensagem
  const notifyNewMessage = useCallback((
    senderName: string, 
    message: string, 
    conversationId?: string,
    doNotDisturb?: { enabled: boolean; start?: string; end?: string }
  ) => {
    return sendNotification(
      `Nova mensagem de ${senderName}`, 
      {
        body: message.length > 100 ? message.substring(0, 100) + '...' : message,
        tag: `chat-${conversationId || 'general'}`,
      },
      doNotDisturb
    );
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    isEnabled: permission === 'granted',
    requestPermission,
    sendNotification,
    notifyNewMessage,
  };
}
