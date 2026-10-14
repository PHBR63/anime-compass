import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Repeat, ShieldAlert } from "lucide-react";

// Limites nas últimas 24 horas para disparar os alertas.
const LIMITE_FALHAS = 5;
const LIMITE_FALLBACK = 3;

const NOMES: Record<string, string> = {
  timeout_consulta: "tempo esgotado na consulta",
  erro_rede_consulta: "erro de rede",
  todas_bases_falharam: "todas as fontes falharam",
  erro_http_jikan: "erro HTTP do Jikan",
  falha_capa: "falha de capa",
  erro_traducao: "erro de tradução",
  timeout_importacao: "tempo esgotado na importação",
  erro_importacao: "erro na importação",
  timeout: "tempo esgotado",
  erro_rede: "erro de rede",
};

/** Traduz um motivo técnico (ex.: status_503) para texto legível. */
function nomeMotivo(m: string) {
  if (m.startsWith("status_")) return `resposta ${m.slice(7)}`;
  return NOMES[m] ?? m.replace(/_/g, " ");
}

/** Conta ocorrências e devolve os 3 motivos mais frequentes como texto. */
function resumir(itens: string[]) {
  const contagem = new Map<string, number>();
  itens.forEach((i) => contagem.set(i, (contagem.get(i) ?? 0) + 1));
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([m, n]) => `${nomeMotivo(m)} (${n}x)`).join(", ");
}

/**
 * Alertas de recorrência: avisam quando, nas últimas 24h, as importações
 * do Jikan acumularam muitas falhas ou acionaram a reserva repetidamente.
 */
export function JikanRecurringAlerts() {
  const { data } = useQuery({
    queryKey: ["jikan-recurring-alerts"],
    queryFn: async () => {
      const desde = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data, error } = await supabase.from("jikan_import_logs")
        .select("evento, resultado, detalhes, created_at")
        .gte("created_at", desde)
        .in("resultado", ["erro", "aviso"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
  if (!data) return null;

  // Um evento terminal representa uma execução; diagnósticos intermediários não duplicam a contagem.
  const falhas = data.filter((l) => ["erro_importacao", "timeout_importacao"].includes(l.evento));
  const fallbacks = data.filter((l) => l.evento === "fallback_acionado");
  const motivoFallback = (l: (typeof data)[number]) =>
    String(((l.detalhes ?? {}) as Record<string, unknown>).motivo ?? "desconhecido");
  const ultima = (lista: typeof data) => new Date(lista[0].created_at).toLocaleString("pt-BR");

  if (falhas.length < LIMITE_FALHAS && fallbacks.length < LIMITE_FALLBACK) return null;

  return (
    <div className="space-y-3">
      {falhas.length >= LIMITE_FALHAS && (
        <Alert variant="destructive" className="border-destructive/50">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Falhas acumuladas na importação do Jikan</AlertTitle>
          <AlertDescription className="space-y-1 text-xs sm:text-sm">
            <p>{falhas.length} falhas nas últimas 24 horas (a última em {ultima(falhas)}).</p>
            <p className="break-words"><strong>Principais motivos:</strong> {resumir(falhas.map((l) => l.evento))}.</p>
            <p className="text-muted-foreground">Veja os detalhes em Catálogo → Logs.</p>
          </AlertDescription>
        </Alert>
      )}
      {fallbacks.length >= LIMITE_FALLBACK && (
        <Alert className="border-primary/50">
          <Repeat className="h-4 w-4" />
          <AlertTitle>Reserva acionada repetidamente</AlertTitle>
          <AlertDescription className="space-y-1 text-xs sm:text-sm">
            <p>Seu servidor próprio falhou e a API pública foi usada {fallbacks.length} vezes nas últimas 24 horas (a última em {ultima(fallbacks)}).</p>
            <p className="break-words"><strong>Motivos:</strong> {resumir(fallbacks.map(motivoFallback))}.</p>
            <p className="text-muted-foreground">Confira se o seu servidor do Jikan está no ar.</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
