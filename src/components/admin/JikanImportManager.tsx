import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Download, Loader2, Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Modo = "full" | "season";
interface Resultado {
  success: boolean;
  continue: boolean;
  page: number;
  totalPages: number;
  processed: number;
  stats: { novos: number; atualizados: number; capas: number; falhasCapas: number; filtrados: number };
}

/** Executa ações administrativas e apresenta o erro real devolvido pelo serviço. */
async function chamarJikan(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("import-jikan", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detalhes = await error.context.json().catch(() => null);
      throw new Error(detalhes?.error ?? error.message);
    }
    throw error;
  }
  if (!data?.success) throw new Error(data?.error ?? "Falha na importação");
  return data;
}

/** Gerencia páginas Jikan com pausa segura, retomada e proteção dos textos cadastrados. */
export function JikanImportManager() {
  const [modo, setModo] = useState<Modo>("full");
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const pausado = useRef(true);
  const montado = useRef(true);
  const cliente = useQueryClient();
  const { data: estado, refetch } = useQuery({ queryKey: ["jikan-import-status"], queryFn: async () => (await chamarJikan({ action: "status" })).data, retry: false });
  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; pausado.current = true; };
  }, []);

  /** Processa páginas sequencialmente; pausa somente depois de salvar a página atual. */
  async function executarImportacao(pagina: number, todas: boolean, modoExecucao = modo) {
    if (executando) return;
    pausado.current = false;
    setExecutando(true);
    setMensagem("");
    try {
      let atual = pagina;
      while (!pausado.current && montado.current) {
        const dados: Resultado = await chamarJikan({ action: "process", mode: modoExecucao, page: atual });
        if (!montado.current) return;
        setResultado(dados);
        setLogs(anteriores => [...anteriores.slice(-19), `Página ${dados.page}: ${dados.stats.novos} novos, ${dados.stats.atualizados} atualizados, ${dados.stats.capas} capas salvas${dados.stats.falhasCapas ? `, ${dados.stats.falhasCapas} capas pendentes` : ""}.`]);
        await refetch();
        cliente.invalidateQueries({ queryKey: ["freeapi-stats"] });
        cliente.invalidateQueries({ queryKey: ["image-sync-stats"] });
        if (!dados.continue || !todas) { toast.success(dados.continue ? "Página importada" : "Sincronização Jikan concluída"); break; }
        atual = dados.page + 1;
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    } catch (erro) {
      if (montado.current) { const texto = erro instanceof Error ? erro.message : "Falha na importação"; setMensagem(texto); toast.error(texto); }
    } finally {
      pausado.current = true;
      if (montado.current) { setExecutando(false); await refetch(); }
    }
  }

  /** Reinicia apenas o progresso, sem apagar animes ou traduções. */
  async function reiniciarProgresso() {
    try { await chamarJikan({ action: "reset" }); setResultado(null); setLogs([]); setMensagem(""); await refetch(); }
    catch (erro) { toast.error(erro instanceof Error ? erro.message : "Falha ao reiniciar"); }
  }

  const pagina = resultado?.page ?? estado?.current_page ?? 0;
  const total = resultado?.totalPages ?? estado?.max_page ?? 0;
  const retomavel = estado?.current_page > 0 && estado.current_page < estado.max_page;
  return (
    <Card className="min-w-0 border-primary/20">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Download className="h-5 w-5 shrink-0 text-primary" />Catálogo Jikan</CardTitle></CardHeader>
      <CardContent className="space-y-4 min-w-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={modo} onValueChange={valor => setModo(valor as Modo)} disabled={executando}>
            <SelectTrigger aria-label="Seleção do catálogo Jikan"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="full">Catálogo completo</SelectItem><SelectItem value="season">Temporada atual</SelectItem></SelectContent>
          </Select>
          <p className="self-center text-sm text-muted-foreground">Textos cadastrados preservados · Capas incluídas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => executarImportacao(1, true)} disabled={executando || estado?.is_running} className="gap-2"><RefreshCw className="h-4 w-4" />Importar / atualizar</Button>
          <Button variant="outline" onClick={() => executarImportacao(estado?.mode === modo && retomavel ? estado.current_page + 1 : 1, false)} disabled={executando || estado?.is_running} className="gap-2"><Download className="h-4 w-4" />Importar uma página</Button>
          {executando ? <Button variant="secondary" onClick={() => { pausado.current = true; }} className="gap-2"><Pause className="h-4 w-4" />Pausar</Button> : retomavel ? <Button variant="secondary" onClick={() => { setModo(estado.mode); executarImportacao(estado.current_page + 1, true, estado.mode); }} className="gap-2"><Play className="h-4 w-4" />Retomar</Button> : null}
          <Button variant="ghost" size="icon" aria-label="Reiniciar progresso Jikan" title="Reiniciar progresso" onClick={reiniciarProgresso} disabled={executando || estado?.is_running}><RotateCcw className="h-4 w-4" /></Button>
        </div>
        {(pagina > 0 || executando) && <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2">{executando && <Loader2 className="h-4 w-4 animate-spin" />}Página {pagina} / {total || "—"}</span><span>{(resultado?.processed ?? estado?.total_synced ?? 0).toLocaleString("pt-BR")} processados</span></div>
          <Progress value={total ? pagina / total * 100 : 0} />
        </div>}
        {(mensagem || estado?.last_error) && <p role="alert" className="break-words text-sm text-destructive">{mensagem || estado.last_error}</p>}
        {logs.length > 0 && <div role="log" aria-label="Resultados da importação Jikan" className="max-h-48 overflow-y-auto rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">{logs.map((log, indice) => <p className="break-words" key={indice}>{log}</p>)}</div>}
      </CardContent>
    </Card>
  );
}