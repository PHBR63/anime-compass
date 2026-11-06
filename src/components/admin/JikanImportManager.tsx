import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Download, Loader2, Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Modo = "full" | "season";
interface Execucao {
  mode: Modo; status: "queued" | "working" | "waiting" | "paused" | "completed" | "failed";
  pause_requested: boolean; attempt: number; next_attempt_at: string; last_error: string | null;
}
interface Estado {
  mode: Modo; current_page: number; max_page: number | null; total_synced: number;
  is_running: boolean; last_error: string | null; server_run: Execucao | null;
}

/** Envia somente comandos públicos; autenticação e coordenação ficam no servidor. */
async function chamarJikan(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("import-jikan", { body });
  if (error) {
    const detalhes = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    throw new Error(detalhes?.error ?? "Não foi possível consultar a importação. Tente novamente.");
  }
  if (!data?.success) throw new Error(data?.error ?? "A execução não foi confirmada.");
  return data;
}

/** Mostra exclusivamente o progresso confirmado e controla a execução persistida no servidor. */
export function JikanImportManager() {
  const [modo, setModo] = useState<Modo>("full");
  const [comando, setComando] = useState(false);
  const { data: estado, error, refetch } = useQuery<Estado>({
    queryKey: ["jikan-import-status"],
    queryFn: async () => (await chamarJikan({ action: "status" })).data,
    retry: false, refetchInterval: 5000,
  });
  const execucao = estado?.server_run;
  const ativa = Boolean(execucao && ["queued", "working", "waiting"].includes(execucao.status));
  const ocupada = Boolean(estado?.is_running);
  const incompleta = Boolean(estado && estado.current_page > 0 && (!estado.max_page || estado.current_page < estado.max_page));
  const modoAtual = incompleta ? estado?.mode ?? modo : modo;
  const pagina = estado?.current_page ?? 0, total = estado?.max_page ?? 0;
  const horaTentativa = execucao?.next_attempt_at ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(execucao.next_attempt_at)) : "—";
  const status = execucao?.pause_requested && ocupada ? "Pausando após a página atual"
    : execucao?.status === "waiting" ? `Aguardando a fonte · tentativa ${execucao.attempt} · próxima verificação após ${horaTentativa}`
    : execucao?.status === "working" ? `Processando página ${pagina + 1} no servidor`
    : execucao?.status === "queued" ? "Execução autônoma na fila"
    : execucao?.status === "paused" ? "Execução autônoma pausada · progresso salvo"
    : execucao?.status === "failed" ? "Execução interrompida · requer retomada administrativa"
    : execucao?.status === "completed" ? "Atualização autônoma concluída"
    : ocupada ? "Importação anterior em andamento · preservada"
    : incompleta ? "Progresso anterior salvo · disponível para retomada autônoma"
    : pagina > 0 ? "Importação concluída" : "Pronto para importar";

  /** Inicia ou retoma sem repetir páginas confirmadas; pausa não cancela a página adquirida. */
  async function enviar(action: "start" | "resume" | "pause" | "process") {
    setComando(true);
    try {
      await chamarJikan({ action, mode: modoAtual, ...(action === "process" ? { page: incompleta ? pagina + 1 : 1 } : {}) });
      toast.success(action === "pause" ? "Pausa solicitada" : action === "process" ? "Página confirmada" : "Execução autônoma confirmada");
    } catch (falha) { toast.error(falha instanceof Error ? falha.message : "Não foi possível alterar a execução"); }
    finally { setComando(false); await refetch(); }
  }
  return (
    <Card className="min-w-0 border-primary/20">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Download className="h-5 w-5 shrink-0 text-primary" />Catálogo Jikan</CardTitle></CardHeader>
      <CardContent className="min-w-0 space-y-4">
        <Select value={modoAtual} onValueChange={valor => setModo(valor as Modo)} disabled={ativa || ocupada || incompleta || comando}>
          <SelectTrigger aria-label="Seleção do catálogo Jikan"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="full">Catálogo completo</SelectItem><SelectItem value="season">Temporada atual</SelectItem></SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 [&>button]:max-w-full [&>button]:whitespace-normal">
          <Button onClick={() => enviar(incompleta || execucao?.status === "paused" || execucao?.status === "failed" ? "resume" : "start")} disabled={!estado || ativa || ocupada || comando} className="gap-2">
            {incompleta ? <Play className="h-4 w-4 shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}{incompleta ? "Retomar no servidor" : "Importar / atualizar"}
          </Button>
          {ativa && <Button variant="secondary" onClick={() => enviar("pause")} disabled={comando || execucao?.pause_requested} className="gap-2"><Pause className="h-4 w-4 shrink-0" />Pausar</Button>}
          <Button variant="outline" onClick={() => enviar("process")} disabled={!estado || ativa || ocupada || comando} className="gap-2"><Download className="h-4 w-4 shrink-0" />Importar uma página</Button>
          <Button variant="ghost" size="icon" aria-label="Atualizar progresso Jikan" title="Atualizar progresso" onClick={() => refetch()} disabled={comando}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <p role="status" aria-live="polite" className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground">{(ativa || ocupada || comando) && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}<span className="min-w-0 break-words">{status}</span></p>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Página {pagina} / {total || "—"}</span><span>{(estado?.total_synced ?? 0).toLocaleString("pt-BR")} processados</span></div>
          <Progress value={total ? Math.min(100, pagina / total * 100) : 0} />
        </div>
        {(execucao?.last_error || estado?.last_error || error) && <p role="alert" className="break-words text-sm text-destructive">{execucao?.last_error || estado?.last_error || "Não foi possível consultar o progresso."}</p>}
      </CardContent>
    </Card>
  );
}
