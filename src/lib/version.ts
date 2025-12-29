/**
 * Informações de versão do app
 * Atualizado automaticamente a cada build
 * IMPORTANTE: Manter sincronizado com SW_VERSION em public/custom-sw.js
 */
export const APP_VERSION = '2.1.0';
export const BUILD_DATE = new Date().toISOString();
export const VERSION_NAME = 'Sakura';

/**
 * Retorna string formatada da versão
 */
export function getVersionString(): string {
  return `v${APP_VERSION} (${VERSION_NAME})`;
}

/**
 * Retorna data do build formatada
 */
export function getBuildDateFormatted(): string {
  return new Date(BUILD_DATE).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
