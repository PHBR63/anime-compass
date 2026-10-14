import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ScrollText } from "lucide-react";

const EVENTOS: Record<string, string> = {
  consulta_iniciada: "Consulta iniciada",
  consulta_respondida: "Consulta respondida",
  timeout_consulta: "Tempo esgotado na consulta",
  erro_rede_consulta: "Erro de rede",
  fallback_acionado: "Reserva acionada",
  todas_bases_falharam: "Todas as fontes falharam",
  erro_http_jikan: "Erro HTTP do Jikan",
  falha_capa: "Falha de capa",
  erro_traducao: "Erro de tradução",
  pagina_concluida: "Página concluída",
  timeout_importacao: "Tempo esgotado na importação",
  erro_importacao: "Erro na importação",
};
const PERIODOS: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
const CORES: Record<string, "default" | "secondary" | "destructive" | "outline"> = { sucesso: "default", aviso: "secondary", erro: "destructive", info: "outline" };
const RESULTADOS: Record<string, string> = { sucesso: "Sucesso", aviso: "Aviso", erro: "Erro", info: "Info" };

/** Painel de consulta dos logs de diagnóstico das importações do Jikan, com filtros. */
export function JikanImportLogs() {
  const [periodo, setPeriodo] = useState("24h");
  const [evento, setEvento] = useState("todos");
  const [base, setBase] = useState("todas");
  const [resultado, setResultado] = useState("todos");

  // Busca os logs aplicando os filtros no servidor (máximo 200 linhas).
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["jikan-import-logs", periodo, evento, base, resultado],
    queryFn: async () => {
      const desde = new Date(Date.now() - PERIODOS[periodo] * 3600_000).toISOString();
      let q = supabase.from("jikan_import_logs").select("*").gte("created_at", desde).order("created_at", { ascending: false }).limit(200);
      if (evento !== "todos") q = q.eq("evento", evento);
      if (base !== "todas") q = q.eq("base", base);
      if (resultado !== "todos") q = q.eq("resultado", resultado);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  /** Gera um resumo curto dos detalhes do evento. */
  const resumo = (d: unknown) => {
    const o = (d ?? {}) as Record<string, unknown>;
    return ["status", "motivo", "erro", "duracao_ms", "mal_id", "novos", "atualizados"]
      .filter((k) => o[k] !== undefined && o[k] !== null)
      .map((k) => `${k === "duracao_ms" ? "duração" : k}: ${k === "duracao_ms" ? `${o[k]} ms` : String(o[k])}`)
      .join(" · ");
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><ScrollText className="h-4 w-4" />Logs das importações</CardTitle>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar logs">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem><SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem><SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={evento} onValueChange={setEvento}>
            <SelectTrigger aria-label="Evento"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eventos</SelectItem>
              {Object.entries(EVENTOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={base} onValueChange={setBase}>
            <SelectTrigger aria-label="Fonte"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as fontes</SelectItem>
              <SelectItem value="publica">API pública</SelectItem><SelectItem value="propria">Servidor próprio</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger aria-label="Resultado"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os resultados</SelectItem>
              {Object.entries(RESULTADOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">{isLoading ? "Carregando..." : `${data.length} registro(s)${data.length === 200 ? " (mostrando os 200 mais recentes)" : ""}`}</p>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum log encontrado com esses filtros.</p>}
          {data.map((log) => (
            <div key={log.id} className="rounded-md border p-2 sm:p-3 text-xs sm:text-sm min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={CORES[log.resultado] ?? "outline"}>{RESULTADOS[log.resultado] ?? log.resultado}</Badge>
                <span className="font-medium">{EVENTOS[log.evento] ?? log.evento}</span>
                {log.base && <Badge variant="outline">{log.base === "publica" ? "API pública" : "Servidor próprio"}</Badge>}
                {log.pagina !== null && <span className="text-muted-foreground">pág. {log.pagina}</span>}
                <span className="ml-auto text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
              </div>
              {resumo(log.detalhes) && <p className="mt-1 text-muted-foreground break-words">{resumo(log.detalhes)}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
