import { useState, useEffect, useCallback, useRef } from 'react';

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
 * Chaves para localStorage
 */
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_TIME_KEY = 'pwa-install-dismissed-time';

/**
 * Tempo para resetar o dismiss automaticamente (7 dias)
 */
const DISMISS_RESET_TIME = 7 * 24 * 60 * 60 * 1000;

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
    if (typeof window === 'undefined') return false;
    
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    const dismissedTime = localStorage.getItem(DISMISS_TIME_KEY);
    
    // Auto-reset após 7 dias
    if (dismissed && dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime);
      if (elapsed > DISMISS_RESET_TIME) {
        localStorage.removeItem(DISMISS_KEY);
        localStorage.removeItem(DISMISS_TIME_KEY);
        return false;
      }
    }
    
    return dismissed;
  });
  
  // Ref para prevenir verificações múltiplas
  const checkingRef = useRef(false);

  // Detectar tipo de dispositivo (apenas uma vez)
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

  // Verificar se já está instalado (com debounce)
  useEffect(() => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    
    const checkInstalled = () => {
      try {
        // Verifica display-mode standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        
        // Verifica propriedade do navigator (Safari iOS)
        const isIOSStandalone = (navigator as any).standalone === true;
        
        // Verifica se foi aberto de home screen no Android
        const isAndroidStandalone = document.referrer.includes('android-app://');
        
        const installed = isStandalone || isIOSStandalone || isAndroidStandalone;
        
        console.log('[PWA Install] Check installed:', { 
          isStandalone, 
          isIOSStandalone, 
          isAndroidStandalone,
          result: installed 
        });
        
        setIsInstalled(installed);
      } catch (error) {
        console.warn('[PWA Install] Erro ao verificar instalação:', error);
      }
    };

    // Verificar após um pequeno delay para garantir que tudo está carregado
    const timer = setTimeout(() => {
      checkInstalled();
      checkingRef.current = false;
    }, 100);

    // Listener para mudanças no display-mode (com debounce)
    let debounceTimer: number;
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    
    const handleChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(checkInstalled, 300);
    };
    
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      clearTimeout(timer);
      clearTimeout(debounceTimer);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Capturar evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA Install] beforeinstallprompt capturado');
      
      // Prevenir o mini-infobar do Chrome
      e.preventDefault();
      
      // Salvar o evento para usar depois
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA Install] App instalado!');
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      
      // Limpar o dismiss do localStorage após instalação
      localStorage.removeItem(DISMISS_KEY);
      localStorage.removeItem(DISMISS_TIME_KEY);
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
      console.warn('[PWA Install] Prompt de instalação não disponível');
      return false;
    }

    try {
      console.log('[PWA Install] Mostrando prompt de instalação...');
      
      // Mostrar o prompt nativo
      await deferredPrompt.prompt();
      
      // Aguardar a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA Install] Resultado:', outcome);
      
      // Limpar o prompt
      setDeferredPrompt(null);
      setCanInstall(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA Install] Erro ao instalar PWA:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Função para dispensar o banner
  const dismissBanner = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
    localStorage.setItem(DISMISS_TIME_KEY, Date.now().toString());
  }, []);

  // Função para resetar o dismiss
  const resetDismiss = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem(DISMISS_KEY);
    localStorage.removeItem(DISMISS_TIME_KEY);
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
