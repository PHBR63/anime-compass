import { useWifiImagePrefetch } from '@/hooks/useWifiImagePrefetch';

/**
 * Componente invisível que ativa o pré-carregamento de imagens em WiFi
 * Deve ser montado dentro do AuthProvider para ter acesso ao usuário
 */
export function WifiImagePrefetcher() {
  // O hook gerencia todo o comportamento internamente
  useWifiImagePrefetch();
  
  // Não renderiza nada visualmente
  return null;
}
