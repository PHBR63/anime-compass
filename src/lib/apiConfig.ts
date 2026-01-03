/**
 * Configuração centralizada das URLs das APIs de anime
 * Facilita manutenção e evita duplicação de URLs em múltiplos arquivos
 */

/**
 * FreeAPI - Catálogo de Animes AniTrack
 * API própria com dados completos
 * Benefícios:
 * - Sem rate limit para o frontend
 * - Latência baixa (dados locais)
 * - Suporte a sinopses em PT-BR
 * - Filtros avançados (gênero, estúdio, ano, etc)
 */
export const FREEAPI_URL = 'https://tawcauhcogjnthocdhce.supabase.co/functions/v1/anime-api';

// Alias para compatibilidade com código existente
export const CATALOG_API_URL = FREEAPI_URL;
