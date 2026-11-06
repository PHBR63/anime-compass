import { test, expect } from "bun:test";
import { classificarRespostaWorker } from "../supabase/functions/jikan-worker/lifecycle";

test("falha temporária mantém retomada e respeita Retry-After", () => {
  expect(classificarRespostaWorker(200, { retryable: true, retryAfterMs: 60000 }).retryable).toBe(true);
  expect(classificarRespostaWorker(429, { retryAfterMs: 60000 }).waitMs).toBe(60000);
});
test("falha permanente não dispara retentativa", () => {
  expect(classificarRespostaWorker(422, { retryable: false }).retryable).toBe(false);
  expect(classificarRespostaWorker(403, null).retryable).toBe(false);
});
test("resposta perdida é recuperável e espera inválida não vira prazo inválido", () => {
  expect(classificarRespostaWorker(503, null).retryable).toBe(true);
  expect(classificarRespostaWorker(200, { retryAfterMs: NaN }).waitMs).toBe(0);
});