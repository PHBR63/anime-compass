import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  Loader2,
  Terminal,
  Activity,
  Zap,
  ArrowRight,
  PlayCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

/**
 * Interface para log de sincronização detalhado
 */
interface SyncLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, unknown>;
  trigger?: string;
  mode?: string;
  stats?: {
    fetched?: number;
    inserted?: number;
    updated?: number;
    skipped?: number;
    errors?: number;
  };
}

/**
 * Interface para execução de sincronização
 */
interface SyncRun {
  id: string;
  started_at: string;
  completed_at?: string;
  trigger: string;
  mode: string;
  status: 'running' | 'completed' | 'failed';
  stats: {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  duration_ms?: number;
  logs: SyncLogEntry[];
}

/**
 * Interface para resposta da API de logs
 */
interface SyncLogsResponse {
  success: boolean;
  data: {
    runs: SyncRun[];
    logs: SyncLogEntry[];
    stats: {
      total_runs: number;
      total_processed: number;
      total_inserted: number;
      total_updated: number;
      total_errors: number;
      period_hours: number;
    };
  };
}

/**
 * Componente de logs detalhados para sincronização do catálogo
 */
export function CatalogSyncLogs() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [logLevel, setLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [periodHours, setPeriodHours] = useState<string>('24');

  // Buscar logs reais da edge function
  const { data: logsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'sync-logs', periodHours],
    queryFn: async (): Promise<SyncLogsResponse | null> => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-sync-logs?hours=${periodHours}&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao buscar logs');
      }

      return response.json();
    },
    staleTime: 1000 * 10,
    refetchInterval: autoRefresh ? 15000 : false,
    retry: 1,
  });

  // Buscar logs de auditoria relacionados ao catálogo
  const { data: auditLogs, refetch: refetchAudit } = useQuery({
    queryKey: ['admin', 'catalog-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'anime_catalog')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return data;
    },
    staleTime: 1000 * 30,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Dados extraídos da resposta
  const syncRuns = logsData?.data?.runs || [];
  const syncLogs = logsData?.data?.logs || [];
  const apiStats = logsData?.data?.stats;

  // Filtrar logs por nível
  const filteredLogs = syncLogs.filter(log => {
    if (logLevel === 'all') return true;
    return log.level === logLevel;
  });

  // Função para obter ícone do nível
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <ArrowRight className="h-4 w-4 text-blue-500" />;
    }
  };

  // Função para atualizar manualmente
  const handleRefresh = () => {
    refetch();
    refetchAudit();
    toast.success('Logs atualizados!');
  };

  // Estatísticas
  const totalRuns = apiStats?.total_runs || syncRuns.length;
  const successfulRuns = syncRuns.filter(r => r.status === 'completed').length;
  const failedRuns = syncRuns.filter(r => r.status === 'failed').length;
  const totalProcessed = apiStats?.total_processed || 0;

  return (
    <div className="space-y-6">
      {/* Header com estatísticas rápidas */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle>Logs de Sincronização</CardTitle>
              {isRefetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Seletor de período */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Período:</Label>
                <Select value={periodHours} onValueChange={setPeriodHours}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hora</SelectItem>
                    <SelectItem value="6">6 horas</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="48">48 horas</SelectItem>
                    <SelectItem value="168">7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh-logs"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh-logs" className="text-sm">
                  Auto-refresh
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
          <CardDescription>
            Monitoramento detalhado das sincronizações com a API Jikan
            {apiStats && ` • Período: ${apiStats.period_hours}h`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Total de Runs</span>
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : totalRuns}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs">Sucesso</span>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : successfulRuns}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs">Falhas</span>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : failedRuns}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs">Processados</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : totalProcessed}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de logs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Logs em Tempo Real</span>
            <span className="sm:hidden">Live</span>
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico de Runs</span>
            <span className="sm:hidden">Runs</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Auditoria</span>
            <span className="sm:hidden">Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* Logs em tempo real */}
        <TabsContent value="live" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-medium">Console de Logs</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={logLevel === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogLevel('all')}
                  >
                    Todos ({syncLogs.length})
                  </Button>
                  <Button
                    variant={logLevel === 'info' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogLevel('info')}
                  >
                    Info
                  </Button>
                  <Button
                    variant={logLevel === 'error' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogLevel('error')}
                  >
                    Error
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-lg border bg-black/90 p-4 font-mono text-sm">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                    <p>Carregando logs...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Terminal className="h-8 w-8 mb-2 opacity-50" />
                    <p>Nenhum log disponível no período selecionado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-gray-300">
                        <span className="text-gray-500 whitespace-nowrap text-xs">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss")}
                        </span>
                        {getLevelIcon(log.level)}
                        <span className={`flex-1 break-all ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          log.level === 'success' ? 'text-green-400' :
                          'text-gray-300'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico de runs */}
        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Execuções Recentes
                {syncRuns.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {syncRuns.length} runs
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : syncRuns.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {syncRuns.map((run) => (
                      <div 
                        key={run.id}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedRun === run.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedRun(selectedRun === run.id ? null : run.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {run.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : run.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Loader2 className="h-4 w-4 text-primary animate-spin" />
                            )}
                            <span className="font-medium text-sm">
                              {format(new Date(run.started_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {run.trigger.toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {run.mode}
                            </Badge>
                            {run.duration_ms && (
                              <Badge variant="outline" className="text-xs">
                                {run.duration_ms}ms
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(run.started_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        
                        {/* Estatísticas da run */}
                        <div className="flex gap-4 text-xs flex-wrap">
                          <span className="text-muted-foreground">
                            Fetched: <span className="text-blue-500 font-medium">{run.stats.fetched}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Inseridos: <span className="text-green-500 font-medium">{run.stats.inserted}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Atualizados: <span className="text-yellow-500 font-medium">{run.stats.updated}</span>
                          </span>
                          {run.stats.errors > 0 && (
                            <span className="text-muted-foreground">
                              Erros: <span className="text-red-500 font-medium">{run.stats.errors}</span>
                            </span>
                          )}
                        </div>

                        {/* Logs detalhados da run (expandido) */}
                        {selectedRun === run.id && run.logs && run.logs.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">
                              Animes processados ({run.logs.length}):
                            </p>
                            <ScrollArea className="h-[150px]">
                              <div className="space-y-1">
                                {run.logs.slice(0, 10).map((log) => (
                                  <div key={log.id} className="text-xs text-muted-foreground">
                                    • {log.message}
                                  </div>
                                ))}
                                {run.logs.length > 10 && (
                                  <div className="text-xs text-primary">
                                    ... e mais {run.logs.length - 10} itens
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p>Nenhuma execução registrada no período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs de auditoria */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Logs de Auditoria do Catálogo
                {auditLogs && auditLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {auditLogs.length} registros
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs && auditLogs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {auditLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-3 rounded-lg border bg-muted/30 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>
                        {log.record_id && (
                          <p className="text-xs text-muted-foreground">
                            Record ID: {log.record_id}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-50" />
                  <p>Nenhum log de auditoria disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
