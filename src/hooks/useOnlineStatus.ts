import { useState, useEffect, useCallback } from 'react';

/**
 * Função helper para obter status online de forma segura
 */
function getOnlineStatus(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' 
    ? navigator.onLine 
    : true;
}

/**
 * Hook para detectar e monitorar o status de conexão do usuário
 * Útil para mostrar indicadores offline e gerenciar operações pendentes
 */
export function useOnlineStatus() {
  // Estado inicial baseado no navigator.onLine
  const [isOnline, setIsOnline] = useState(true);

  // Timestamp da última mudança de status
  const [lastStatusChange, setLastStatusChange] = useState<Date | null>(null);

  // Se voltou online recentemente (útil para sincronização)
  const [justCameOnline, setJustCameOnline] = useState(false);

  // Handler para quando fica online
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastStatusChange(new Date());
    setJustCameOnline(true);
    
    // Reset o flag após 5 segundos
    setTimeout(() => {
      setJustCameOnline(false);
    }, 5000);
  }, []);

  // Handler para quando fica offline
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setLastStatusChange(new Date());
    setJustCameOnline(false);
  }, []);

  useEffect(() => {
    // Verificar status inicial no cliente
    setIsOnline(getOnlineStatus());

    // Adicionar listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Função para verificar conexão real (ping)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Tentar fazer um request pequeno para verificar conectividade real
      const response = await fetch('/favicon.png', {
        method: 'HEAD',
        cache: 'no-store'
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastStatusChange,
    justCameOnline,
    checkConnection
  };
}
