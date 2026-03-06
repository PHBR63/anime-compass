import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Play,
  Pause,
  ArrowRightLeft,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Interface para progresso de importação paginada
 */
interface ProgressoImportacao {
  emExecucao: boolean;
  pagina: number;
  totalPaginas: number;
  processados: number;
  total: number;
  inicioExecucao: Date | null;
  pausado: boolean;
}

/**
 * Interface para estatísticas do delta sync
 */
interface EstatisticasDelta {
  criados: number;
  atualizados: number;
  removidos: number;
  total: number;
  inseridos: number;
}

/**
 * Calcula o tempo decorrido desde o início da importação
 */
function calcularTempoDecorrido(inicio: Date | null): string {
  if (!inicio) return "";
  const elapsed = Math.floor((Date.now() - inicio.getTime()) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}m ${seconds}s`;
}

/**
 * Componente de gerenciamento de importação do catálogo
 * Responsável por importação completa paginada e sincronização delta
 */
export function CatalogImportManager() {
  const [logs, setLogs] = useState<string[]>([]);
  const [estatisticasDelta, setEstatisticasDelta] = useState<EstatisticasDelta | null>(null);
  const [progresso, setProgresso] = useState<ProgressoImportacao>({
    emExecucao: false,
    pagina: 0,
    totalPaginas: 0,
    processados: 0,
    total: 0,
    inicioExecucao: null,
    pausado: false
  });
  const queryClient = useQueryClient();

  /** Monitora status da importação no backend (polling) */
  const { data: statusImportacao, refetch: atualizarStatus } = useQuery({
    queryKey: ["import-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("import-catalog", {
        method: "GET"
      });
      if (error) throw error;
      return data?.data;
    },
    refetchInterval: progresso.emExecucao ? 2000 : 30000,
  });

  /** Mutation para importação completa paginada (uma página por vez) */
  const importacaoCompletaMutation = useMutation({
    mutationFn: async (page: number = 1) => {
      const { data, error } = await supabase.functions.invoke("import-catalog", {
        body: { mode: "full", page }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, page) => {
      if (data.success) {
        const progress = data.data?.progress;
        const newLogs = data.data?.logs || [];

        setLogs(prev => [...prev.slice(-20), ...newLogs]);
        setProgresso(prev => ({
          ...prev,
          emExecucao: data.continue,
          pagina: progress?.page || page,
          totalPaginas: progress?.totalPages || 0,
          processados: progress?.processed || 0,
          total: progress?.total || 0,
        }));

        // Continua automaticamente se não estiver pausado
        if (data.continue && !progresso.pausado) {
          const nextPage = (progress?.page || page) + 1;
          setTimeout(() => importacaoCompletaMutation.mutate(nextPage), 500);
        } else if (!data.continue) {
          toast.success(`🎉 Importação completa! ${progress?.processed || 0} animes importados`);
          setProgresso(prev => ({ ...prev, emExecucao: false }));
          queryClient.invalidateQueries({ queryKey: ["freeapi-stats"] });
        }
      } else {
        toast.error("Falha na importação");
        setLogs(prev => [...prev, `❌ Erro: ${data.error?.message || 'Desconhecido'}`]);
        setProgresso(prev => ({ ...prev, emExecucao: false }));
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setLogs(prev => [...prev, `❌ Erro: ${error.message}`]);
      setProgresso(prev => ({ ...prev, emExecucao: false }));
    }
  });

  /** Inicia a importação completa do catálogo */
  const iniciarImportacaoCompleta = () => {
    setProgresso({
      emExecucao: true,
      pagina: 0,
      totalPaginas: 0,
      processados: 0,
      total: 0,
      inicioExecucao: new Date(),
      pausado: false
    });
    setLogs(["🚀 Iniciando importação completa paginada..."]);
    importacaoCompletaMutation.mutate(1);
  };

  /** Alterna entre pausar e retomar a importação */
  const alternarPausaImportacao = () => {
    if (progresso.pausado) {
      setProgresso(prev => ({ ...prev, pausado: false }));
      setLogs(prev => [...prev, "▶️ Retomando importação..."]);
      importacaoCompletaMutation.mutate(progresso.pagina + 1);
    } else {
      setProgresso(prev => ({ ...prev, pausado: true }));
      setLogs(prev => [...prev, "⏸️ Importação pausada pelo usuário"]);
    }
  };

  /** Reseta estado de importação travada */
  const resetarEstadoImportacao = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-catalog?action=reset`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );
      if (!response.ok) throw new Error('Falha ao resetar');
      toast.success("Estado resetado com sucesso!");
      setProgresso({
        emExecucao: false,
        pagina: 0,
        totalPaginas: 0,
        processados: 0,
        total: 0,
        inicioExecucao: null,
        pausado: false
      });
      setLogs(prev => [...prev, "🔄 Estado resetado"]);
      atualizarStatus();
    } catch (error) {
      toast.error(`Erro ao resetar: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  };

  /** Mutation para sincronização delta (apenas mudanças recentes) */
  const sincronizacaoDeltaMutation = useMutation({
    mutationFn: async () => {
      setProgresso({
        emExecucao: true,
        pagina: 0,
        totalPaginas: 0,
        processados: 0,
        total: 0,
        inicioExecucao: new Date(),
        pausado: false
      });
      setLogs(["🔄 Iniciando sincronização delta..."]);
      setEstatisticasDelta(null);

      const { data: statsData } = await supabase.functions.invoke("anime-api", { method: "GET" });
      const since = statsData?.data?.last_sync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.functions.invoke("import-catalog", {
        body: { mode: "delta", since }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setProgresso(prev => ({ ...prev, emExecucao: false }));
      if (data.success) {
        const stats = data.data?.stats;
        if (stats) {
          setEstatisticasDelta({
            criados: stats.created || 0,
            atualizados: stats.updated || 0,
            removidos: stats.deleted || 0,
            total: stats.total || 0,
            inseridos: stats.inserted || 0
          });
        }
        const totalChanges = (stats?.created || 0) + (stats?.updated || 0) + (stats?.deleted || 0);
        toast.success(
          totalChanges > 0
            ? `Sync concluído: ${stats?.created || 0} novos, ${stats?.updated || 0} atualizados, ${stats?.deleted || 0} removidos`
            : 'Nenhuma atualização encontrada'
        );
        setLogs(data.data?.logs || []);
        queryClient.invalidateQueries({ queryKey: ["freeapi-stats"] });
      } else {
        toast.error("Falha no sync");
        setLogs(data.data?.logs || []);
      }
    },
    onError: (error) => {
      setProgresso(prev => ({ ...prev, emExecucao: false }));
      toast.error(`Erro: ${error.message}`);
    }
  });

  const emImportacao = importacaoCompletaMutation.isPending || sincronizacaoDeltaMutation.isPending || progresso.emExecucao;

  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-transparent ${emImportacao ? 'ring-2 ring-primary/50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Importar Catálogo Externo
          {emImportacao && !progresso.pausado && (
            <Badge variant="default" className="ml-2 bg-primary animate-pulse">
              Em andamento
            </Badge>
          )}
          {progresso.pausado && (
            <Badge variant="secondary" className="ml-2">
              <Pause className="h-3 w-3 mr-1" />
              Pausado
            </Badge>
          )}
          {statusImportacao?.is_stalled && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Travado
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Importe animes de uma API externa com 13.400+ títulos (paginado, retomável)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progresso em tempo real paginado */}
        {(emImportacao || progresso.pagina > 0) && (
          <div className={`p-4 rounded-lg border space-y-3 ${progresso.pausado ? 'bg-muted/50 border-muted' : 'bg-primary/10 border-primary/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {emImportacao && !progresso.pausado ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : progresso.pausado ? (
                  <Pause className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium text-foreground">
                  {emImportacao && !progresso.pausado
                    ? `Importando página ${progresso.pagina} de ${progresso.totalPaginas || '?'}...`
                    : progresso.pausado
                      ? 'Importação pausada'
                      : 'Importação concluída'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 font-mono">
                  {progresso.processados.toLocaleString("pt-BR")} / {progresso.total.toLocaleString("pt-BR")}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {calcularTempoDecorrido(progresso.inicioExecucao)}
                </Badge>
              </div>
            </div>

            <Progress
              value={progresso.total > 0 ? (progresso.processados / progresso.total) * 100 : 0}
              className="h-3"
            />

            <div className="flex flex-wrap justify-between text-xs text-muted-foreground gap-2">
              <span>📄 Página {progresso.pagina} / {progresso.totalPaginas || '?'}</span>
              <span>
                {progresso.total > 0
                  ? `${Math.round((progresso.processados / progresso.total) * 100)}% concluído`
                  : 'Calculando...'}
              </span>
              <span>📦 {statusImportacao?.catalog_size?.toLocaleString("pt-BR") || '...'} no catálogo local</span>
            </div>

            {/* Estimativa de tempo restante */}
            {progresso.processados > 0 && progresso.inicioExecucao && progresso.total > progresso.processados && (
              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  ⏱️ Estimativa: ~{Math.ceil(
                    ((progresso.total - progresso.processados) / progresso.processados) *
                    ((Date.now() - progresso.inicioExecucao.getTime()) / 60000)
                  )} min restantes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Alerta de estado travado */}
        {statusImportacao?.is_stalled && (
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="font-medium text-foreground">Importação travada detectada</span>
            </div>
            <p className="text-sm text-muted-foreground">
              O processo anterior foi interrompido inesperadamente (página {statusImportacao.current_page}).
              Clique em "Resetar" para limpar o estado e iniciar uma nova importação.
            </p>
            <Button
              onClick={resetarEstadoImportacao}
              variant="outline"
              className="gap-2 border-orange-500/50 hover:bg-orange-500/10"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar Estado
            </Button>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-3">
          {!emImportacao && !progresso.pausado ? (
            <Button
              onClick={iniciarImportacaoCompleta}
              disabled={emImportacao || statusImportacao?.is_stalled}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Importação Completa
            </Button>
          ) : (
            <Button
              onClick={alternarPausaImportacao}
              variant={progresso.pausado ? "default" : "secondary"}
              className="gap-2"
            >
              {progresso.pausado ? (
                <>
                  <Play className="h-4 w-4" />
                  Retomar
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pausar
                </>
              )}
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => sincronizacaoDeltaMutation.mutate()}
            disabled={emImportacao || statusImportacao?.is_stalled}
            className="gap-2"
          >
            {sincronizacaoDeltaMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            Sincronizar Atualizações
          </Button>
        </div>

        {/* Estatísticas detalhadas do Delta Sync */}
        {estatisticasDelta && !emImportacao && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium text-foreground">Delta Sync Concluído</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold text-green-500">{estatisticasDelta.criados}</p>
                <p className="text-xs text-muted-foreground">Novos</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold text-blue-500">{estatisticasDelta.atualizados}</p>
                <p className="text-xs text-muted-foreground">Atualizados</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold text-orange-500">{estatisticasDelta.removidos}</p>
                <p className="text-xs text-muted-foreground">Removidos</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold text-foreground">{estatisticasDelta.inseridos}</p>
                <p className="text-xs text-muted-foreground">Inseridos no BD</p>
              </div>
            </div>
            {estatisticasDelta.total === 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                ✅ Catálogo já está atualizado - nenhuma mudança necessária
              </p>
            )}
          </div>
        )}

        {/* Logs de importação */}
        {logs.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Logs {emImportacao && !progresso.pausado && <span className="animate-pulse">(em tempo real)</span>}:
            </p>
            <div className="space-y-1 text-xs font-mono">
              {logs.slice(-15).map((log, i) => (
                <p key={i} className={`${log.includes('❌') ? 'text-destructive' : log.includes('✅') || log.includes('🎉') ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
