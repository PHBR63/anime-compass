import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Download, Loader2, Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { calcularEsperaJikan, lerRetomadaJikan, type RetomadaJikan } from "@/lib/jikanRetry";
import { toast } from "sonner";

type Modo = "full" | "season";
interface Estado {
  mode: Modo; current_page: number; max_page: number | null;
  total_synced: number; is_running: boolean; last_error: string | null; adminId: string;
}
interface Resultado {
  success: boolean; continue: boolean; page: number; totalPages: number; processed: number;
  stats: { novos: number; atualizados: number; capas: number; falhasCapas: number; filtrados: number };
}

/** Identifica falhas temporárias e o prazo mínimo informado pelo serviço. */
class ErroJikan extends Error {
  constructor(mensagem: string, readonly temporario: boolean, readonly esperaMs = 0) { super(mensagem); }
}

/** Converte falhas de rede em mensagens legíveis em português. */
function traduzirErro(mensagem: string): string {
  return /timed out|timeout|aborted|failed to fetch|failed to send/i.test(mensagem)
    ? "O Jikan não respondeu ou a conexão foi interrompida. O progresso salvo será preservado."
    : mensagem;
}

/** Executa ações administrativas mantendo a classificação dos erros devolvidos pelo servidor. */
async function chamarJikan(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("import-jikan", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detalhes = await error.context.json().catch(() => null);
      const status = error.context.status;
      throw new ErroJikan(traduzirErro(detalhes?.error ?? error.message), detalhes?.retryable ?? (status === 408 || status === 429 || status >= 500 || status === 409), Number(detalhes?.retryAfterMs) || 0);
    }
    throw new ErroJikan(traduzirErro(error.message), true);
  }
  if (!data?.success) throw new ErroJikan(data?.error ?? "Falha na importação", data?.retryable === true, Number(data?.retryAfterMs) || 0);
  return data;
}

/** Gerencia a retomada por administrador e consulta o progresso confirmado antes de repetir páginas. */
export function JikanImportManager() {
  const [modo, setModo] = useState<Modo>("full");
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [retomada, setRetomada] = useState<RetomadaJikan | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const pausado = useRef(true);
  const ativo = useRef(false);
  const montado = useRef(true);
  const restaurado = useRef("");
  const cliente = useQueryClient();
  const { data: estado, error: erroEstado, refetch } = useQuery<Estado>({
    queryKey: ["jikan-import-status"],
    queryFn: async () => {
      const { data: usuario } = await supabase.auth.getUser();
      if (!usuario.user) throw new ErroJikan("Entre novamente para consultar a importação.", false);
      return { ...(await chamarJikan({ action: "status" })).data, adminId: usuario.user.id };
    },
    retry: false,
    refetchInterval: consulta => consulta.state.data?.is_running ? 10000 : false,
  });
  const chave = estado?.adminId ? `jikan-retomada:${estado.adminId}` : "";

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; pausado.current = true; };
  }, []);
  useEffect(() => {
    if (!executando) return;
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [executando]);
  useEffect(() => {
    if (!chave || restaurado.current === chave) return;
    restaurado.current = chave;
    let salvo: RetomadaJikan | null = null;
    try { salvo = lerRetomadaJikan(localStorage.getItem(chave)); } catch { /* Retomada manual permanece disponível sem armazenamento. */ }
    if (salvo) {
      setModo(salvo.modo);
      void executarImportacao(salvo.pagina, salvo.todas, salvo.modo, salvo);
    }
  }, [chave]);

  /** Persiste apenas a intenção do administrador; pausa explícita remove a retomada automática. */
  function salvarRetomada(valor: RetomadaJikan | null) {
    if (montado.current) setRetomada(valor);
    try {
      if (chave) { if (valor) localStorage.setItem(chave, JSON.stringify(valor)); else localStorage.removeItem(chave); }
    } catch { /* A execução continua nesta tela se o navegador impedir armazenamento. */ }
  }

  /** Aguarda o prazo progressivo e permite cancelar imediatamente sem novas chamadas. */
  async function aguardar(prazo: number) {
    while (Date.now() < prazo && !pausado.current && montado.current) {
      await new Promise(resolve => setTimeout(resolve, Math.min(250, prazo - Date.now())));
    }
  }

  /** Repete falhas temporárias sem avançar o checkpoint e retoma respostas perdidas com segurança. */
  async function executarImportacao(pagina: number, todas: boolean, modoExecucao = modo, salvo?: RetomadaJikan) {
    if (ativo.current || !chave) return;
    ativo.current = true;
    pausado.current = false;
    setExecutando(true);
    setMensagem(salvo?.erro ?? "");
    let progresso: RetomadaJikan = salvo ?? { modo: modoExecucao, pagina, todas, tentativa: 0, proximaTentativa: 0, erro: "" };
    let reconciliar = Boolean(salvo);
    salvarRetomada(progresso);
    try {
      while (!pausado.current && montado.current) {
        await aguardar(progresso.proximaTentativa);
        if (pausado.current || !montado.current) break;
        try {
          if (reconciliar) {
            const confirmado: Estado = (await chamarJikan({ action: "status" })).data;
            if (confirmado.is_running) throw new ErroJikan("Aguardando a página em andamento ou a liberação da execução interrompida.", true, 5000);
            if (confirmado.mode === modoExecucao && confirmado.current_page >= progresso.pagina) {
              if (!todas || (confirmado.max_page && confirmado.current_page >= confirmado.max_page)) {
                salvarRetomada(null); setMensagem(""); toast.success("Importação confirmada e recuperada"); break;
              }
              progresso = { ...progresso, pagina: confirmado.current_page + 1 };
              salvarRetomada(progresso);
            } else if (confirmado.mode !== modoExecucao && confirmado.current_page > 0) {
              throw new ErroJikan("O modo da importação foi alterado em outra execução. Selecione o catálogo e retome manualmente.", false);
            }
            reconciliar = false;
          }
          const dados: Resultado = await chamarJikan({ action: "process", mode: modoExecucao, page: progresso.pagina });
          // Salva a próxima página mesmo se o usuário tiver saído enquanto a resposta chegava.
          progresso = { ...progresso, pagina: dados.page + 1, tentativa: 0, proximaTentativa: Date.now() + 1200, erro: "" };
          if (pausado.current && montado.current) salvarRetomada(null);
          else salvarRetomada(dados.continue && todas ? progresso : null);
          if (!montado.current) break;
          setResultado(dados); setMensagem("");
          setLogs(anteriores => [...anteriores.slice(-19), `Página ${dados.page}: ${dados.stats.novos} novos, ${dados.stats.atualizados} atualizados, ${dados.stats.capas} capas salvas${dados.stats.falhasCapas ? `, ${dados.stats.falhasCapas} capas pendentes` : ""}.`]);
          await refetch();
          void cliente.invalidateQueries({ queryKey: ["freeapi-stats"] });
          void cliente.invalidateQueries({ queryKey: ["image-sync-stats"] });
          if (!dados.continue || !todas) { toast.success(dados.continue ? "Página importada" : "Sincronização Jikan concluída"); break; }
        } catch (erro) {
          if (!montado.current || pausado.current) break;
          const falha = erro instanceof ErroJikan ? erro : new ErroJikan(erro instanceof Error ? erro.message : "Falha na importação", false);
          setMensagem(falha.message);
          if (!falha.temporario) { salvarRetomada(null); toast.error(falha.message); break; }
          const tentativa = progresso.tentativa + 1;
          const espera = calcularEsperaJikan(tentativa, falha.esperaMs);
          progresso = { ...progresso, tentativa, proximaTentativa: Date.now() + espera, erro: falha.message };
          salvarRetomada(progresso); reconciliar = true; setAgora(Date.now());
          setLogs(anteriores => [...anteriores.slice(-19), `Página ${progresso.pagina}: ${falha.message} Nova tentativa ${tentativa} em ${Math.ceil(espera / 1000)} s.`]);
          void refetch();
        }
      }
    } finally {
      ativo.current = false;
      if (montado.current) { setExecutando(false); await refetch(); }
    }
  }

  /** Cancela as tentativas pendentes; a página atual pode terminar e permanece salva no servidor. */
  function pausarImportacao() {
    pausado.current = true;
    salvarRetomada(null);
    setMensagem("");
  }

  /** Reinicia apenas o progresso, sem apagar animes ou traduções. */
  async function reiniciarProgresso() {
    try { await chamarJikan({ action: "reset" }); salvarRetomada(null); setResultado(null); setLogs([]); setMensagem(""); await refetch(); }
    catch (erro) { toast.error(erro instanceof Error ? erro.message : "Falha ao reiniciar"); }
  }

  const pagina = resultado?.page ?? estado?.current_page ?? 0;
  const total = resultado?.totalPages ?? estado?.max_page ?? 0;
  const retomavel = Boolean(estado && (estado.last_error || (estado.current_page > 0 && (!estado.max_page || estado.current_page < estado.max_page))));
  const segundos = retomada ? Math.max(0, Math.ceil((retomada.proximaTentativa - agora) / 1000)) : 0;
  const aguardando = executando && Boolean(retomada?.tentativa) && segundos > 0;
  const status = executando ? pausado.current ? "Pausando após a página atual" : aguardando ? `Aguardando Jikan · tentativa ${retomada?.tentativa} em ${segundos} s` : `Processando página ${retomada?.pagina ?? pagina + 1}` : estado?.is_running ? "Página em processamento em outra execução" : mensagem ? "Importação interrompida" : retomavel ? "Importação pausada · progresso salvo" : pagina > 0 ? "Importação concluída" : "Pronto para importar";
  return (
    <Card className="min-w-0 border-primary/20">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Download className="h-5 w-5 shrink-0 text-primary" />Catálogo Jikan</CardTitle></CardHeader>
      <CardContent className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={modo} onValueChange={valor => setModo(valor as Modo)} disabled={executando}>
            <SelectTrigger aria-label="Seleção do catálogo Jikan"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="full">Catálogo completo</SelectItem><SelectItem value="season">Temporada atual</SelectItem></SelectContent>
          </Select>
          <p className="self-center text-sm text-muted-foreground">Textos cadastrados preservados · Capas incluídas</p>
        </div>
        <div className="flex flex-wrap gap-2 [&>button]:max-w-full [&>button]:whitespace-normal">
          <Button onClick={() => executarImportacao(1, true)} disabled={!chave || executando || estado?.is_running} className="gap-2"><RefreshCw className="h-4 w-4 shrink-0" />Importar / atualizar</Button>
          <Button variant="outline" onClick={() => executarImportacao(estado?.mode === modo && retomavel ? estado.current_page + 1 : 1, false)} disabled={!chave || executando || estado?.is_running} className="gap-2"><Download className="h-4 w-4 shrink-0" />Importar uma página</Button>
          {executando ? <Button variant="secondary" onClick={pausarImportacao} className="gap-2"><Pause className="h-4 w-4" />Pausar</Button> : retomavel && estado ? <Button variant="secondary" onClick={() => { setModo(estado.mode); void executarImportacao(estado.current_page + 1, true, estado.mode); }} disabled={estado.is_running} className="gap-2"><Play className="h-4 w-4" />Retomar</Button> : null}
          <Button variant="ghost" size="icon" aria-label="Reiniciar progresso Jikan" title="Reiniciar progresso" onClick={reiniciarProgresso} disabled={!chave || executando || estado?.is_running}><RotateCcw className="h-4 w-4" /></Button>
        </div>
        <p role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">{executando && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}<span className="min-w-0 break-words">{status}</span></p>
        {(pagina > 0 || executando) && <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Página {pagina} / {total || "—"}</span><span>{(resultado?.processed ?? estado?.total_synced ?? 0).toLocaleString("pt-BR")} processados</span></div>
          <Progress value={total ? Math.min(100, pagina / total * 100) : 0} />
        </div>}
        {(mensagem || estado?.last_error || erroEstado) && <p role="alert" className="break-words text-sm text-destructive">{traduzirErro(mensagem || estado?.last_error || (erroEstado instanceof Error ? erroEstado.message : "Não foi possível consultar o progresso."))}</p>}
        {logs.length > 0 && <div role="log" aria-label="Resultados da importação Jikan" className="max-h-48 space-y-1 overflow-y-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{logs.map((log, indice) => <p className="break-words" key={indice}>{log}</p>)}</div>}
      </CardContent>
    </Card>
  );
}
