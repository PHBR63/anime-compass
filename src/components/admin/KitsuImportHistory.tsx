import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw } from "lucide-react";

/** Formata milissegundos em texto curto (ex.: 1,2 s ou 3 min). */
function formatarDuracao(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 60000) return `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)} min`;
  return `${(ms / 3600000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

/** Lista as últimas execuções da importação do Kitsu com duração, contagens e erros resolvidos. */
export function KitsuImportHistory() {
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kitsu-import-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kitsu_import_history").select("*").order("started_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  // Resumo das execuções carregadas.
  const sucesso = data.filter(h => h.status === "success");
  const erros = data.filter(h => h.status === "error");
  const resumo = [
    { rotulo: "Páginas", valor: sucesso.length },
    { rotulo: "Novos", valor: sucesso.reduce((t, h) => t + h.created_count, 0) },
    { rotulo: "Completados", valor: sucesso.reduce((t, h) => t + h.updated_count, 0) },
    { rotulo: "Erros resolvidos", valor: `${erros.filter(e => e.resolved_at).length}/${erros.length}` },
  ];

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 sm:p-6">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><History className="h-5 w-5 text-primary" />Histórico do Kitsu</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Últimas 50 execuções de página.</CardDescription>
        </div>
        <Button size="icon" variant="ghost" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar histórico">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {resumo.map(r => (
            <div key={r.rotulo} className="rounded-md bg-muted p-2 text-center">
              <p className="text-base font-semibold sm:text-lg">{r.valor}</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">{r.rotulo}</p>
            </div>
          ))}
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && !data.length && <p className="text-sm text-muted-foreground">Nenhuma importação do Kitsu registrada ainda.</p>}
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {data.map(h => (
            <li key={h.id} className="rounded-md border border-border p-2 text-xs min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge variant={h.status === "success" ? "secondary" : h.resolved_at ? "outline" : "destructive"}>
                  {h.status === "success" ? "Concluída" : h.resolved_at ? "Erro resolvido" : "Erro"}
                </Badge>
                <span className="font-medium">Página {h.page} · {h.mode === "discover" ? "Novos" : "Completar"}</span>
                <span className="text-muted-foreground">{new Date(h.started_at).toLocaleString("pt-BR")}</span>
                <span className="text-muted-foreground">· {formatarDuracao(h.duration_ms)}</span>
              </div>
              {h.status === "success" ? (
                <p className="mt-1 text-muted-foreground">{h.created_count} novos · {h.updated_count} completados · {h.covers_count} capas{h.cover_failures ? ` · ${h.cover_failures} capas falharam` : ""}</p>
              ) : (
                <p className="mt-1 break-words text-muted-foreground">
                  {h.error_message}
                  {h.resolved_at && ` — resolvido em ${new Date(h.resolved_at).toLocaleString("pt-BR")} (após ${formatarDuracao(h.resolved_after_ms)})`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
