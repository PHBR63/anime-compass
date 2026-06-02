/**
 * Escapa caracteres especiais do padrão LIKE/ILIKE do PostgreSQL.
 * Previne que usuários injetem `%` e `_` em buscas, evitando enumeração
 * de dados e resultados de busca inesperados.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}
