import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para gerenciar sons de notificação do chat
 * Toca um som quando uma nova mensagem é recebida
 */
export function useChatNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isWindowFocused = useRef(true);

  // Inicializar áudio
  useEffect(() => {
    // Criar elemento de áudio com som de notificação
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleEQviZ67sIFVO0V3o76laTNKVp67yJlqPx40UKDN16tyIgk3dZWxvINLRjdXhJymf1xHPUxuqcGmhEpIQE1/mKqGYTlRX3qUmHxRXUJgg5aSe1dTPFBxjZSBWkRKVHCFioFaSUZUb4WLgVpIRlRvhYuBWklGVG+Fi4FaSUZUb4WLgVpJRlRvhYuBWklGVG+Fi4FaSUZUb4WLgVpJRlRvhYuBWklGVG+Fi4FaSUZUb4WLgVpJRlRvhYqBWkk=');
    audioRef.current.volume = 0.5;

    // Rastrear foco da janela
    const handleFocus = () => { isWindowFocused.current = true; };
    const handleBlur = () => { isWindowFocused.current = false; };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Função para tocar notificação
  const playNotification = useCallback(() => {
    // Só tocar se a janela não está focada
    if (!isWindowFocused.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignorar erro se o browser bloquear autoplay
        console.log('[useChatNotification] Autoplay bloqueado pelo navegador');
      });
    }
  }, []);

  // Função para forçar tocar (mesmo com janela focada)
  const playNotificationForce = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        console.log('[useChatNotification] Autoplay bloqueado pelo navegador');
      });
    }
  }, []);

  return {
    playNotification,
    playNotificationForce,
    isWindowFocused: () => isWindowFocused.current,
  };
}
