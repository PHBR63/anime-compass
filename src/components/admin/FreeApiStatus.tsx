import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Database, 
  Image, 
  Languages, 
  RefreshCw, 
  Clock, 
  TrendingUp,
  Film,
  Tv,
  Clapperboard,
  Music,
  Star,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  ArrowRightLeft,
  Play
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FREEAPI_URL } from "@/lib/apiConfig";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Interface para estatísticas da FreeAPI
 */
interface FreeApiStats {
  total_anime: number;
  with_images: number;
  with_synopsis_pt: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  year_range: { min: number; max: number };
  score_range: { min: number; max: number };
  last_sync: string | null;
}

/**
 * Busca estatísticas da FreeAPI
 */
async function fetchFreeApiStats(): Promise<FreeApiStats> {
  // Busca estatísticas básicas
  const statsResponse = await fetch(`${FREEAPI_URL}?action=stats`);
  if (!statsResponse.ok) throw new Error("Falha ao buscar estatísticas");
  const statsData = await statsResponse.json();
  
  // Conta animes com sinopse em PT-BR (usando query separada)
  const ptResponse = await fetch(`${FREEAPI_URL}?limit=1&has_synopsis_pt=true`);
  const ptData = await ptResponse.json();
  
  return {
    ...statsData.data,
    with_synopsis_pt: ptData.pagination?.total || 0
  };
}

/**
 * Componente de card de estatística individual
 */
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  description?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Componente de barra de progresso com label
 */
function ProgressBar({ 
  label, 
  value, 
  total, 
  color = "primary" 
}: { 
  label: string; 
  value: number; 
  total: number;
  color?: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value.toLocaleString("pt-BR")} / {total.toLocaleString("pt-BR")} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

/**
 * Ícone para tipo de anime
 */
function getTypeIcon(type: string) {
  switch (type) {
    case "TV": return Tv;
    case "Movie": return Film;
    case "OVA": case "ONA": return Clapperboard;
    case "Music": return Music;
    default: return Star;
  }
}

/**
 * Componente principal de status da FreeAPI
 */
export function FreeApiStatus() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{
    isRunning: boolean;
    total: number;
    processed: number;
    currentBatch: number;
    startTime: Date | null;
  }>({ isRunning: false, total: 0, processed: 0, currentBatch: 0, startTime: null });
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ["freeapi-stats"],
    queryFn: fetchFreeApiStats,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60 * 1000, // Atualiza a cada minuto
  });

  // Query para monitorar status da importação (polling enquanto em execução)
  const { data: importStatus } = useQuery({
    queryKey: ["import-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("import-catalog", {
        method: "GET"
      });
      if (error) throw error;
      return data?.data;
    },
    refetchInterval: importProgress.isRunning ? 2000 : false, // Poll a cada 2s durante importação
    enabled: importProgress.isRunning,
  });

  // Mutation para importação completa
  const fullImportMutation = useMutation({
    mutationFn: async () => {
      // Marca início da importação
      setImportProgress({
        isRunning: true,
        total: 13400, // Estimativa baseada na API externa
        processed: 0,
        currentBatch: 0,
        startTime: new Date()
      });
      setImportLogs(["🚀 Iniciando importação completa..."]);
      
      const { data, error } = await supabase.functions.invoke("import-catalog", {
        body: { mode: "full" }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setImportProgress(prev => ({ ...prev, isRunning: false }));
      if (data.success) {
        const stats = data.data?.stats;
        toast.success(`Importação concluída: ${stats?.inserted || 0} animes em ${stats?.batches || 0} batches`);
        setImportLogs(data.data?.logs || []);
        queryClient.invalidateQueries({ queryKey: ["freeapi-stats"] });
        refetch();
      } else {
        toast.error("Falha na importação");
        setImportLogs(data.data?.logs || []);
      }
    },
    onError: (error) => {
      setImportProgress(prev => ({ ...prev, isRunning: false }));
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Mutation para sincronização delta
  const deltaSyncMutation = useMutation({
    mutationFn: async () => {
      setImportProgress({
        isRunning: true,
        total: 0,
        processed: 0,
        currentBatch: 0,
        startTime: new Date()
      });
      setImportLogs(["🔄 Iniciando sincronização delta..."]);
      
      const since = stats?.last_sync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.functions.invoke("import-catalog", {
        body: { mode: "delta", since }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setImportProgress(prev => ({ ...prev, isRunning: false }));
      if (data.success) {
        toast.success(`Sync concluído: ${data.data?.stats?.inserted || 0} atualizações`);
        setImportLogs(data.data?.logs || []);
        queryClient.invalidateQueries({ queryKey: ["freeapi-stats"] });
        refetch();
      } else {
        toast.error("Falha no sync");
        setImportLogs(data.data?.logs || []);
      }
    },
    onError: (error) => {
      setImportProgress(prev => ({ ...prev, isRunning: false }));
      toast.error(`Erro: ${error.message}`);
    }
  });

  const isImporting = fullImportMutation.isPending || deltaSyncMutation.isPending || importProgress.isRunning;

  // Calcula tempo decorrido
  const getElapsedTime = () => {
    if (!importProgress.startTime) return "";
    const elapsed = Math.floor((Date.now() - importProgress.startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Handler para atualizar manualmente
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Renderiza skeleton durante carregamento
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Renderiza erro
  if (error || !stats) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Erro ao carregar estatísticas</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Tente novamente mais tarde"}
              </p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calcula percentuais
  const imagePercentage = stats.total_anime > 0 
    ? ((stats.with_images / stats.total_anime) * 100).toFixed(1) 
    : "0";
  const synopsisPercentage = stats.total_anime > 0 
    ? ((stats.with_synopsis_pt / stats.total_anime) * 100).toFixed(1) 
    : "0";

  // Formata última sincronização
  const lastSyncText = stats.last_sync 
    ? formatDistanceToNow(new Date(stats.last_sync), { addSuffix: true, locale: ptBR })
    : "Nunca";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">FreeAPI Status</h2>
            <p className="text-sm text-muted-foreground">
              Monitoramento do catálogo de animes
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Clock className="h-3 w-3" />
            Atualizado {lastSyncText}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing || isImporting}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Ações de Importação */}
      <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-transparent ${isImporting ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Importar Catálogo Externo
            {isImporting && (
              <Badge variant="default" className="ml-2 bg-primary animate-pulse">
                Em andamento
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Importe animes de uma API externa com 13.400+ títulos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progresso em tempo real */}
          {isImporting && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium text-foreground">Importando...</span>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {getElapsedTime()}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso estimado</span>
                  <span className="font-medium">
                    {importStatus?.catalog_size?.toLocaleString("pt-BR") || "..."} animes no catálogo
                  </span>
                </div>
                <Progress value={undefined} className="h-2 animate-pulse" />
              </div>
              
              <p className="text-xs text-muted-foreground">
                A importação está processando os dados em batches. Aguarde a conclusão...
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => fullImportMutation.mutate()}
              disabled={isImporting}
              className="gap-2"
            >
              {fullImportMutation.isPending || (isImporting && !deltaSyncMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Importação Completa
            </Button>
            <Button
              variant="secondary"
              onClick={() => deltaSyncMutation.mutate()}
              disabled={isImporting}
              className="gap-2"
            >
              {deltaSyncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )}
              Sincronizar Atualizações
            </Button>
          </div>
          
          {/* Logs de importação */}
          {importLogs.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Logs {isImporting && <span className="animate-pulse">(atualizando...)</span>}:
              </p>
              <div className="space-y-1 text-xs font-mono">
                {importLogs.slice(-15).map((log, i) => (
                  <p key={i} className={`${log.includes('❌') ? 'text-destructive' : log.includes('✅') ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Animes"
          value={stats.total_anime}
          icon={Database}
          description={`Anos: ${stats.year_range?.min || "N/A"} - ${stats.year_range?.max || "N/A"}`}
          trend="up"
        />
        <StatCard
          title="Com Imagens"
          value={`${imagePercentage}%`}
          icon={Image}
          description={`${stats.with_images.toLocaleString("pt-BR")} animes`}
        />
        <StatCard
          title="Sinopses PT-BR"
          value={`${synopsisPercentage}%`}
          icon={Languages}
          description={`${stats.with_synopsis_pt.toLocaleString("pt-BR")} traduzidas`}
        />
        <StatCard
          title="Última Sync"
          value={lastSyncText}
          icon={Clock}
          description={stats.last_sync ? new Date(stats.last_sync).toLocaleString("pt-BR") : "Nunca"}
        />
      </div>

      {/* Cards detalhados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              Distribuição por Tipo
            </CardTitle>
            <CardDescription>
              Quantidade de animes por formato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.by_type && Object.entries(stats.by_type)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const Icon = getTypeIcon(type);
                const percentage = ((count / stats.total_anime) * 100).toFixed(1);
                const typeLabels: Record<string, string> = {
                  TV: "TV",
                  Movie: "Filme",
                  OVA: "OVA",
                  ONA: "ONA",
                  Special: "Especial",
                  Music: "Música"
                };
                
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{typeLabels[type] || type}</span>
                        <span className="text-muted-foreground">
                          {count.toLocaleString("pt-BR")} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={parseFloat(percentage)} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Distribuição por Status
            </CardTitle>
            <CardDescription>
              Estado atual de exibição dos animes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.by_status && Object.entries(stats.by_status)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const percentage = ((count / stats.total_anime) * 100).toFixed(1);
                const statusLabels: Record<string, string> = {
                  "Finished Airing": "Finalizado",
                  "Currently Airing": "Em Exibição",
                  "Not yet aired": "Não Lançado"
                };
                const statusColors: Record<string, string> = {
                  "Finished Airing": "text-green-500",
                  "Currently Airing": "text-blue-500",
                  "Not yet aired": "text-yellow-500"
                };
                
                return (
                  <div key={status} className="flex items-center gap-3">
                    <CheckCircle className={`h-4 w-4 ${statusColors[status] || "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{statusLabels[status] || status}</span>
                        <span className="text-muted-foreground">
                          {count.toLocaleString("pt-BR")} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={parseFloat(percentage)} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Cobertura de dados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Cobertura de Dados
          </CardTitle>
          <CardDescription>
            Progresso de preenchimento do catálogo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar 
            label="Imagens de Capa" 
            value={stats.with_images} 
            total={stats.total_anime} 
          />
          <ProgressBar 
            label="Sinopses em Português" 
            value={stats.with_synopsis_pt} 
            total={stats.total_anime} 
          />
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.year_range?.min || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Ano mais antigo</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.year_range?.max || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Ano mais recente</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.score_range?.min?.toFixed(1) || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Nota mínima</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.score_range?.max?.toFixed(1) || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Nota máxima</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
