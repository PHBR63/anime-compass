import { describe, expect, test } from "bun:test";
import { calcularEsperaJikan, lerRetomadaJikan } from "./jikanRetry";

describe("retomada do Jikan", () => {
  test("aumenta a espera e limita em cinco minutos", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 30].map(t => calcularEsperaJikan(t))).toEqual([5000, 10000, 20000, 40000, 80000, 160000, 300000, 300000]);
  });
  test("respeita o Retry-After e a duração de um bloqueio", () => {
    expect(calcularEsperaJikan(1, 60000)).toBe(60000);
    expect(calcularEsperaJikan(7, 600000)).toBe(600000);
  });
  test("restaura a mesma página, modo e prazo após interrupção", () => {
    const progresso = { modo: "season", pagina: 4, todas: true, tentativa: 3, proximaTentativa: 180000, erro: "Jikan indisponível" };
    expect(lerRetomadaJikan(JSON.stringify(progresso))).toEqual(progresso);
  });
  test("descarta progresso inválido", () => {
    for (const valor of [null, "{", "{}", JSON.stringify({ modo: "full", pagina: -1 })]) expect(lerRetomadaJikan(valor)).toBeNull();
  });
});