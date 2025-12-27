/**
 * Componente de pré-carregamento de imagens em WiFi
 * 
 * DESATIVADO: O prefetch de imagens foi desabilitado porque as imagens
 * do CDN do MyAnimeList bloqueiam requisições CORS via fetch/Cache API.
 * As imagens funcionam normalmente via tag <img>, apenas o cache
 * programático não funciona.
 * 
 * TODO: Reativar quando houver uma solução para cache de imagens cross-origin
 */
export function WifiImagePrefetcher() {
  // Prefetch desativado - não faz nada
  return null;
}
