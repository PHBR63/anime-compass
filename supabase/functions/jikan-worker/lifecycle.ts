/** Classifica a resposta sem tratar falha permanente como nova tentativa infinita. */
export function classificarRespostaWorker(status: number, dados: { retryable?: boolean; error?: string; retryAfterMs?: number } | null) {
  return {
    retryable: dados?.retryable ?? (status === 408 || status === 409 || status === 429 || status >= 500),
    error: dados?.error ?? "Resposta da importação não confirmada; reconciliando checkpoint.",
    waitMs: Number.isFinite(dados?.retryAfterMs) ? Math.max(0, Number(dados?.retryAfterMs)) : 0,
  };
}