import { useState, useCallback, useEffect } from 'react';

/**
 * Chave no localStorage para preferência de auto-update
 */
const AUTO_UPDATE_KEY = 'pwa-auto-update';

/**
 * Hook para gerenciar preferência de atualização automática do PWA
 * Permite ao usuário escolher entre atualização automática silenciosa ou manual
 */
export function useAutoUpdate() {
  // Estado inicial baseado no localStorage
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(AUTO_UPDATE_KEY);
      // Por padrão, auto-update está HABILITADO para melhor experiência
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  /**
   * Alterna o estado de auto-update
   */
  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem(AUTO_UPDATE_KEY, String(newValue));
      console.log('[PWA] Auto-update:', newValue ? 'habilitado' : 'desabilitado');
      return newValue;
    });
  }, []);

  /**
   * Define o estado de auto-update diretamente
   */
  const setAutoUpdate = useCallback((value: boolean) => {
    localStorage.setItem(AUTO_UPDATE_KEY, String(value));
    setIsEnabled(value);
    console.log('[PWA] Auto-update:', value ? 'habilitado' : 'desabilitado');
  }, []);

  /**
   * Sincroniza com outras abas/janelas
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === AUTO_UPDATE_KEY) {
        setIsEnabled(event.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    /** Se auto-update está habilitado */
    isEnabled,
    /** Alterna o estado */
    toggle,
    /** Define diretamente */
    setAutoUpdate,
  };
}
