import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  HardDrive,
  CloudUpload,
  Image,
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Interface para estatísticas de imagens locais
 */
interface EstatisticasImagens {
  totalAnimes: number;
  withLocalImage: number;
  withExternalImage: number;
  withoutImage: number;
  localCoverage: number;
  isStalled?: boolean;
  syncProgress?: {
    total: number;
    processed: number;
    success: number;
    failed: number;
    isRunning: boolean;
    currentMalId?: number;
    startedAt?: string;
    lastError?: string;
  } | null;
}

/**
 * Componente de sincronização de imagens para CDN local
 * Gerencia o download de imagens externas para o storage próprio
 */
export function CatalogImageSync() {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoSync, setAutoSync] = useState(() => {
    return localStorage.getItem("admin-auto-image-sync") === "true";
  });

  /** Busca estatísticas de imagens locais com polling dinâmico */
  const { data: estatisticas, refetch: atualizarEstatisticas } = useQuery<EstatisticasImagens>({
    queryKey: ["image-sync-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-images", {
        method: "GET"
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 1000,
    refetchInterval: (query) => {
      const isRunning = query.state.data?.syncProgress?.isRunning;
      return isRunning ? 1000 : 30000;
    },
  });

  /** Mutation para sincronizar chunk de imagens */
  const sincronizarImagensMutation = useMutation({
    mutationFn: async (limit?: number) => {
      setLogs(prev => [...prev, "🖼️ Processando chunk de imagens..."]);
      const { data, error } = await supabase.functions.invoke("sync-images", {
        method: "POST",
        body: limit ? { limit } : {}
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.error && !data.continue) {
        if (!data.progress) {
          toast.error(data.error);
          setLogs(prev => [...prev, `❌ ${data.error}`]);
        }
      } else if (data.continue) {
        const success = data.success ?? data.progress?.success ?? 0;
        const failed = data.failed ?? data.progress?.failed ?? 0;
        const total = data.totalPending ?? data.progress?.total ?? 0;
        const processed = data.processed ?? data.progress?.processed ?? 0;
        const remaining = total > 0 ? total - processed : '?';

        const jaEmAndamento = !!data.error;
        if (jaEmAndamento) {
          const msg = `⏳ Em andamento: ${processed}/${total} processadas (${success} OK). Restam: ${remaining}`;
          setLogs(prev => [...prev.slice(-20), msg]);
        } else {
          const msg = `✅ Chunk: ${success} sucesso, ${failed} falhas. Restam: ${remaining}`;
          setLogs(prev => [...prev.slice(-20), msg]);
          if (autoSync) {
            setTimeout(() => sincronizarImagensMutation.mutate(undefined), 2000);
          }
        }
      } else {
        toast.success("Sincronização de imagens concluída!");
        setLogs(prev => [...prev, "🎉 Sincronização completa!"]);
        setAutoSync(false);
      }
      atualizarEstatisticas();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setLogs(prev => [...prev, `❌ Erro: ${error.message}`]);
    }
  });

  /** Mutation para resetar estado travado de sincronização */
  const resetarSincronizacaoMutation = useMutation({
    mutationFn: async () => {
      // O SDK envia a sessão administrativa atual; a chave pública não autoriza reset.
      const { data, error } = await supabase.functions.invoke("sync-images?action=reset", { method: "GET" });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Estado resetado! Pode iniciar nova sincronização.");
      setLogs(prev => [...prev, "🔄 Estado resetado"]);
      atualizarEstatisticas();
    },
    onError: (error) => {
      toast.error(`Erro ao resetar: ${error.message}`);
    }
  });

  /** Auto-sync: dispara próximo chunk quando o anterior termina */
  useEffect(() => {
    if (!autoSync || !estatisticas) return;
    const isRunning = estatisticas.syncProgress?.isRunning ?? false;
    if (!isRunning && estatisticas.withExternalImage > 0) {
      const timer = setTimeout(() => {
        if (!sincronizarImagensMutation.isPending) {
          sincronizarImagensMutation.mutate(undefined);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoSync, estatisticas?.localCoverage, estatisticas?.syncProgress?.isRunning, estatisticas?.withExternalImage]);

  /** Persiste preferência de auto-sync */
  useEffect(() => {
    localStorage.setItem("admin-auto-image-sync", String(autoSync));
  }, [autoSync]);

  // Não confunde cobertura alta/arredondada com ausência de pendências.
  const sincronizacaoCompleta = Boolean(estatisticas && estatisticas.totalAnimes > 0 && estatisticas.withLocalImage === estatisticas.totalAnimes);
  const emSincronizacao = sincronizarImagensMutation.isPending || estatisticas?.syncProgress?.isRunning;

  return (
    <Card className={`border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-transparent ${emSincronizacao ? 'ring-2 ring-blue-500/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-blue-500" />
              CDN Local de Imagens
              {emSincronizacao && (
                <Badge variant="default" className="ml-2 bg-blue-500 animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Sincronizando
                </Badge>
              )}
              {!emSincronizacao && sincronizacaoCompleta && (
                <Badge variant="default" className="ml-2 bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completo
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sincronize imagens para o CDN próprio e elimine dependência do MyAnimeList
            </CardDescription>
          </div>

          {/* Toggle Auto-Sync */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${autoSync ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              <Label htmlFor="auto-sync" className="text-sm font-medium cursor-pointer">
                Auto-Sync
              </Label>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
              disabled={sincronizacaoCompleta || estatisticas?.withExternalImage === 0}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas de imagens */}
        {estatisticas && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">
                {estatisticas.withLocalImage.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">No CDN Local</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">
                {estatisticas.withExternalImage.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">Apenas Externo</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className={`text-2xl font-bold ${estatisticas.localCoverage >= 90 ? 'text-green-500' : estatisticas.localCoverage >= 50 ? 'text-yellow-500' : 'text-orange-500'}`}>
                {estatisticas.localCoverage}%
              </p>
              <p className="text-xs text-muted-foreground">Cobertura Local</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {estatisticas.withoutImage.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">Sem Imagem</p>
            </div>
          </div>
        )}

        {/* Progresso da sincronização em tempo real */}
        {estatisticas?.syncProgress?.isRunning && (
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="font-medium text-foreground">Sincronizando imagens em tempo real...</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 font-mono">
                  {estatisticas.syncProgress.processed.toLocaleString("pt-BR")} / {estatisticas.syncProgress.total.toLocaleString("pt-BR")}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {Math.round((estatisticas.syncProgress.processed / estatisticas.syncProgress.total) * 100)}%
                </Badge>
              </div>
            </div>

            <Progress
              value={(estatisticas.syncProgress.processed / estatisticas.syncProgress.total) * 100}
              className="h-3"
            />

            <div className="flex flex-wrap justify-between text-xs text-muted-foreground gap-2">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {estatisticas.syncProgress.success.toLocaleString("pt-BR")} sucesso
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                {estatisticas.syncProgress.failed.toLocaleString("pt-BR")} falhas
              </span>
              {estatisticas.syncProgress.currentMalId && (
                <span className="font-mono">
                  Processando: MAL #{estatisticas.syncProgress.currentMalId}
                </span>
              )}
            </div>

            {/* Tempo estimado */}
            {estatisticas.syncProgress.processed > 10 && (
              <div className="pt-2 border-t border-blue-500/20">
                <p className="text-xs text-muted-foreground">
                  ⏱️ Estimativa: ~{Math.ceil((estatisticas.syncProgress.total - estatisticas.syncProgress.processed) / (estatisticas.syncProgress.processed / ((Date.now() - new Date(estatisticas.syncProgress.startedAt || Date.now()).getTime()) / 60000)))} min restantes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Alerta de estado travado */}
        {estatisticas?.isStalled && (
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="font-medium text-foreground">Sincronização travada detectada</span>
            </div>
            <p className="text-sm text-muted-foreground">
              O processo anterior foi interrompido inesperadamente. Clique em "Resetar" para limpar o estado e iniciar uma nova sincronização.
            </p>
            <Button
              onClick={() => resetarSincronizacaoMutation.mutate()}
              disabled={resetarSincronizacaoMutation.isPending}
              variant="outline"
              className="gap-2 border-orange-500/50 hover:bg-orange-500/10"
            >
              {resetarSincronizacaoMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Resetar e Continuar
            </Button>
          </div>
        )}

        {/* Sincronização concluída */}
        {!estatisticas?.syncProgress?.isRunning && !estatisticas?.isStalled && estatisticas && sincronizacaoCompleta && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium text-foreground">Sincronização completa!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {estatisticas.withLocalImage.toLocaleString("pt-BR")} imagens estão armazenadas no CDN local.
              A cobertura está em {estatisticas.localCoverage}%.
            </p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => sincronizarImagensMutation.mutate(undefined)}
            disabled={!!emSincronizacao}
            variant="outline"
            className="gap-2 border-blue-500/50 hover:bg-blue-500/10"
          >
            {emSincronizacao ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            {emSincronizacao ? 'Sincronizando...' : 'Sincronizar Todas'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => sincronizarImagensMutation.mutate(100)}
            disabled={!!emSincronizacao}
            className="gap-2"
          >
            <Image className="h-4 w-4" />
            Sincronizar 100 (Teste)
          </Button>

          {autoSync && !emSincronizacao && estatisticas && estatisticas.withExternalImage > 0 && (
            <Badge variant="outline" className="gap-1.5 text-yellow-600 border-yellow-500/50">
              <Zap className="h-3 w-3" />
              Auto-sync ativo - iniciará automaticamente
            </Badge>
          )}
        </div>

        {/* Logs de sincronização de imagens */}
        {logs.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Logs de imagens {emSincronizacao && <span className="animate-pulse">(em tempo real)</span>}:
            </p>
            <div className="space-y-1 text-xs font-mono">
              {logs.slice(-10).map((log, i) => (
                <p key={i} className={`${log.includes('❌') ? 'text-destructive' : log.includes('✅') ? 'text-green-500' : 'text-muted-foreground'}`}>
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
