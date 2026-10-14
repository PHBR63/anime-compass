/** Limita a espera progressiva a cinco minutos, respeitando o mínimo indicado pelo Jikan. */
export function calcularEsperaJikan(tentativa: number, minimoMs = 0): number {
  return Math.max(Math.min(5000 * 2 ** Math.min(Math.max(tentativa - 1, 0), 6), 300000), minimoMs);
}

export interface RetomadaJikan {
  modo: "full" | "season";
  pagina: number;
  todas: boolean;
  tentativa: number;
  proximaTentativa: number;
  erro: string;
}

/** Valida o progresso armazenado antes de retomar uma importação administrativa. */
export function lerRetomadaJikan(valor: string | null): RetomadaJikan | null {
  try {
    const dados = JSON.parse(valor ?? "null");
    if (!dados || !["full", "season"].includes(dados.modo)
      || !Number.isInteger(dados.pagina) || dados.pagina < 1 || dados.pagina > 100000
      || typeof dados.todas !== "boolean" || !Number.isInteger(dados.tentativa) || dados.tentativa < 0
      || !Number.isFinite(dados.proximaTentativa) || dados.proximaTentativa < 0
      || typeof dados.erro !== "string") return null;
    return dados;
  } catch { return null; }
}