import { useState, useEffect, useCallback } from 'react';

/**
 * Interface para o evento de instalação do PWA
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Hook para gerenciar a instalação do PWA
 * Detecta se o app pode ser instalado e fornece funções para instalar
 */
export function usePWAInstall() {
  // Evento de instalação capturado
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // Se o app já está instalado (standalone mode)
  const [isInstalled, setIsInstalled] = useState(false);
  
  // Se o prompt de instalação está disponível
  const [canInstall, setCanInstall] = useState(false);
  
  // Tipo de dispositivo detectado
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  
  // Se o banner de instalação foi dispensado pelo usuário
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pwa-install-dismissed') === 'true';
    }
    return false;
  });

  // Detectar tipo de dispositivo
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else if (/windows|macintosh|linux/.test(userAgent)) {
      setDeviceType('desktop');
    } else {
      setDeviceType('unknown');
    }
  }, []);

  // Verificar se já está instalado
  useEffect(() => {
    const checkInstalled = () => {
      // Verifica display-mode standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // Verifica propriedade do navigator (Safari iOS)
      const isIOSStandalone = (navigator as any).standalone === true;
      
      // Verifica se foi aberto de home screen no Android
      const isAndroidStandalone = document.referrer.includes('android-app://');
      
      setIsInstalled(isStandalone || isIOSStandalone || isAndroidStandalone);
    };

    checkInstalled();

    // Listener para mudanças no display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => {
      mediaQuery.removeEventListener('change', checkInstalled);
    };
  }, []);

  // Capturar evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir o mini-infobar do Chrome
      e.preventDefault();
      
      // Salvar o evento para usar depois
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      
      // Limpar o dismiss do localStorage após instalação
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Função para disparar a instalação
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('Prompt de instalação não disponível');
      return false;
    }

    try {
      // Mostrar o prompt nativo
      await deferredPrompt.prompt();
      
      // Aguardar a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      // Limpar o prompt
      setDeferredPrompt(null);
      setCanInstall(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Função para dispensar o banner
  const dismissBanner = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  // Função para resetar o dismiss (ex: após uma semana)
  const resetDismiss = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem('pwa-install-dismissed');
  }, []);

  // Se deve mostrar o banner de instalação
  const shouldShowBanner = !isInstalled && !isDismissed && (canInstall || deviceType === 'ios');

  return {
    // Estados
    isInstalled,
    canInstall,
    deviceType,
    isDismissed,
    shouldShowBanner,
    
    // Ações
    install,
    dismissBanner,
    resetDismiss
  };
}
