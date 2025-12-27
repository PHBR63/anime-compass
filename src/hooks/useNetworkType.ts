import { useState, useEffect, useCallback } from 'react';

/**
 * Tipos de conexão de rede detectáveis
 */
export type NetworkType = 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'offline';

/**
 * Interface para informações de rede
 */
export interface NetworkInfo {
  type: NetworkType;
  isWifi: boolean;
  isOnline: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number; // Mbps estimado
  saveData?: boolean; // Se o usuário tem modo economia de dados ativo
}

/**
 * Estende a interface Navigator para incluir connection
 */
interface NetworkInformation extends EventTarget {
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Obtém a conexão de rede do navegador (com fallbacks)
 */
function getConnection(): NetworkInformation | undefined {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

/**
 * Mapeia o tipo de conexão para nosso enum
 */
function mapConnectionType(type?: string): NetworkType {
  if (!navigator.onLine) return 'offline';
  
  switch (type) {
    case 'wifi':
      return 'wifi';
    case 'cellular':
      return 'cellular';
    case 'ethernet':
      return 'ethernet';
    default:
      return 'unknown';
  }
}

/**
 * Hook para detectar o tipo de conexão de rede
 * Útil para decidir quando fazer pré-carregamento de dados pesados
 */
export function useNetworkType(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => {
    const connection = getConnection();
    const type = mapConnectionType(connection?.type);
    
    return {
      type,
      isWifi: type === 'wifi' || type === 'ethernet',
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      saveData: connection?.saveData,
    };
  });

  /**
   * Atualiza informações de rede
   */
  const updateNetworkInfo = useCallback(() => {
    const connection = getConnection();
    const type = mapConnectionType(connection?.type);
    
    setNetworkInfo({
      type,
      isWifi: type === 'wifi' || type === 'ethernet',
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      saveData: connection?.saveData,
    });
  }, []);

  useEffect(() => {
    const connection = getConnection();

    // Listener para mudanças na conexão
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Listeners para online/offline
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
    };
  }, [updateNetworkInfo]);

  return networkInfo;
}

/**
 * Verifica se o usuário está em uma conexão favorável para downloads pesados
 * Considera WiFi, Ethernet, 4G com boa velocidade e sem modo economia
 */
export function isGoodConnectionForPrefetch(info: NetworkInfo): boolean {
  // Não está online
  if (!info.isOnline) return false;
  
  // Modo economia de dados ativo
  if (info.saveData) return false;
  
  // WiFi ou Ethernet são sempre bons
  if (info.isWifi) return true;
  
  // 4G com boa velocidade (>= 2 Mbps)
  if (info.effectiveType === '4g' && info.downlink && info.downlink >= 2) {
    return true;
  }
  
  // Se não conseguimos detectar o tipo, assume que é ok
  if (info.type === 'unknown' && info.isOnline) {
    return true;
  }
  
  return false;
}
