import { useState, useEffect } from "react";
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
  Play,
  HardDrive,
  CloudUpload,
  Zap,
  Pause,
  CheckCircle2,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
 * Interface para estatísticas de imagens locais
 */
interface ImageSyncStats {
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
/**
 * Interface para progresso de importação paginada
 */
interface ImportProgress {
  isRunning: boolean;
  page: number;
  totalPages: number;
  processed: number;
  total: number;
  startTime: Date | null;
  isPaused: boolean;
}

/**
 * Interface para estatísticas do delta sync
 */
interface DeltaSyncStats {
  created: number;
  updated: number;
  deleted: number;
  total: number;
  inserted: number;
}

/**
 * Componente principal de status da FreeAPI
 */
export function FreeApiStatus() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [imageSyncLogs, setImageSyncLogs] = useState<string[]>([]);
  const [deltaSyncStats, setDeltaSyncStats] = useState<DeltaSyncStats | null>(null);
  const [autoSync, setAutoSync] = useState(() => {
    // Persistir preferência de auto-sync
    return localStorage.getItem("admin-auto-image-sync") === "true";
  });
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    isRunning: false,
    page: 0,
    totalPages: 0,
    processed: 0,
    total: 0,
    startTime: null,
    isPaused: false
  });
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ["freeapi-stats"],
    queryFn: fetchFreeApiStats,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60 * 1000, // Atualiza a cada minuto
  });

  // Query para estatísticas de imagens locais com polling dinâmico
  const { data: imageStats, refetch: refetchImageStats } = useQuery<ImageSyncStats>({
    queryKey: ["image-sync-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-images", {
        method: "GET"
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 1000, // 5 segundos
    refetchInterval: (query) => {
      // Polling rápido (1s) se sincronização em andamento, senão 30s
      const isRunning = query.state.data?.syncProgress?.isRunning;
      return isRunning ? 1000 : 30000;
    },
  });

  // Auto-iniciar sincronização quando ativado
  useEffect(() => {
    if (autoSync && imageStats && !imageStats.syncProgress?.isRunning) {
      // Verificar se há imagens para sincronizar e cobertura < 90%
      if (imageStats.localCoverage < 90 && imageStats.withExternalImage > 0) {
        console.log("[FreeApiStatus] Auto-sync: iniciando sincronização automática...");
        imageSyncMutation.mutate(undefined);
      }
    }
  }, [autoSync, imageStats?.localCoverage, imageStats?.syncProgress?.isRunning]);

  // Salvar preferência de auto-sync
  useEffect(() => {
    localStorage.setItem("admin-auto-image-sync", String(autoSync));
  }, [autoSync]);

  // Query para monitorar status da importação (polling enquanto em execução)
  const { data: importStatus, refetch: refetchImportStatus } = useQuery({
    queryKey: ["import-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("import-catalog", {
        method: "GET"
      });
      if (error) throw error;
      return data?.data;
    },
    refetchInterval: importProgress.isRunning ? 2000 : 30000,
  });

  // Mutation para importação completa paginada (uma página por vez)
  const fullImportMutation = useMutation({
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
        const logs = data.data?.logs || [];
        
        // Atualiza logs
        setImportLogs(prev => [...prev.slice(-20), ...logs]);
        
        // Atualiza progresso
        setImportProgress(prev => ({
          ...prev,
          isRunning: data.continue,
          page: progress?.page || page,
          totalPages: progress?.totalPages || 0,
          processed: progress?.processed || 0,
          total: progress?.total || 0,
        }));
        
        // Se houver mais páginas e não estiver pausado, continua automaticamente
        if (data.continue && !importProgress.isPaused) {
          const nextPage = (progress?.page || page) + 1;
          // Pequeno delay para não sobrecarregar
          setTimeout(() => {
            fullImportMutation.mutate(nextPage);
          }, 500);
        } else if (!data.continue) {
          // Importação concluída
          toast.success(`🎉 Importação completa! ${progress?.processed || 0} animes importados`);
          setImportProgress(prev => ({ ...prev, isRunning: false }));
          queryClient.invalidateQueries({ queryKey: ["freeapi-stats"] });
          refetch();
        }
      } else {
        toast.error("Falha na importação");
        setImportLogs(prev => [...prev, `❌ Erro: ${data.error?.message || 'Desconhecido'}`]);
        setImportProgress(prev => ({ ...prev, isRunning: false }));
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setImportLogs(prev => [...prev, `❌ Erro: ${error.message}`]);
      setImportProgress(prev => ({ ...prev, isRunning: false }));
    }
  });

  // Função para iniciar importação completa
  const startFullImport = () => {
    setImportProgress({
      isRunning: true,
      page: 0,
      totalPages: 0,
      processed: 0,
      total: 0,
      startTime: new Date(),
      isPaused: false
    });
    setImportLogs(["🚀 Iniciando importação completa paginada..."]);
    fullImportMutation.mutate(1);
  };

  // Função para pausar/retomar importação
  const togglePauseImport = () => {
    if (importProgress.isPaused) {
      // Retoma
      setImportProgress(prev => ({ ...prev, isPaused: false }));
      setImportLogs(prev => [...prev, "▶️ Retomando importação..."]);
      fullImportMutation.mutate(importProgress.page + 1);
    } else {
      // Pausa
      setImportProgress(prev => ({ ...prev, isPaused: true }));
      setImportLogs(prev => [...prev, "⏸️ Importação pausada pelo usuário"]);
    }
  };

  // Função para resetar estado travado
  const resetImportState = async () => {
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
      setImportProgress({
        isRunning: false,
        page: 0,
        totalPages: 0,
        processed: 0,
        total: 0,
        startTime: null,
        isPaused: false
      });
      setImportLogs(prev => [...prev, "🔄 Estado resetado"]);
      refetchImportStatus();
    } catch (error) {
      toast.error(`Erro ao resetar: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  };

  // Mutation para sincronização delta
  const deltaSyncMutation = useMutation({
    mutationFn: async () => {
      setImportProgress({
        isRunning: true,
        page: 0,
        totalPages: 0,
        processed: 0,
        total: 0,
        startTime: new Date(),
        isPaused: false
      });
      setImportLogs(["🔄 Iniciando sincronização delta..."]);
      setDeltaSyncStats(null); // Limpa estatísticas anteriores
      
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
        const stats = data.data?.stats;
        // Salva estatísticas detalhadas do delta sync
        if (stats) {
          setDeltaSyncStats({
            created: stats.created || 0,
            updated: stats.updated || 0,
            deleted: stats.deleted || 0,
            total: stats.total || 0,
            inserted: stats.inserted || 0
          });
        }
        
        const totalChanges = (stats?.created || 0) + (stats?.updated || 0) + (stats?.deleted || 0);
        toast.success(
          totalChanges > 0 
            ? `Sync concluído: ${stats?.created || 0} novos, ${stats?.updated || 0} atualizados, ${stats?.deleted || 0} removidos`
            : 'Nenhuma atualização encontrada'
        );
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

  // Mutation para sincronização de imagens (chunk-based)
  const imageSyncMutation = useMutation({
    mutationFn: async (limit?: number) => {
      setImageSyncLogs(prev => [...prev, "🖼️ Processando chunk de imagens..."]);
      
      const { data, error } = await supabase.functions.invoke("sync-images", {
        method: "POST",
        body: limit ? { limit } : {}
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.error && !data.continue) {
        // Erro real, não apenas "já em andamento"
        if (!data.progress) {
          toast.error(data.error);
          setImageSyncLogs(prev => [...prev, `❌ ${data.error}`]);
        }
      } else if (data.continue) {
        // Há mais imagens para processar - auto-continuar se auto-sync ativo
        const msg = `✅ Chunk: ${data.success || 0} sucesso, ${data.failed || 0} falhas. Restam: ${data.totalPending - (data.processed || 0)}`;
        setImageSyncLogs(prev => [...prev.slice(-20), msg]);
        
        // Auto-continuar após 2 segundos se auto-sync está ativo
        if (autoSync) {
          setTimeout(() => {
            imageSyncMutation.mutate(undefined);
          }, 2000);
        }
      } else {
        // Sincronização completa
        toast.success("Sincronização de imagens concluída!");
        setImageSyncLogs(prev => [...prev, "🎉 Sincronização completa!"]);
      }
      refetchImageStats();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setImageSyncLogs(prev => [...prev, `❌ Erro: ${error.message}`]);
    }
  });

  // Mutation para resetar estado travado
  const resetSyncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-images", {
        method: "GET",
        headers: { 'Content-Type': 'application/json' }
      });
      // Usar query param para reset
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-images?action=reset`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );
      if (!response.ok) throw new Error('Falha ao resetar');
      return response.json();
    },
    onSuccess: () => {
      toast.success("Estado resetado! Pode iniciar nova sincronização.");
      setImageSyncLogs(prev => [...prev, "🔄 Estado resetado"]);
      refetchImageStats();
    },
    onError: (error) => {
      toast.error(`Erro ao resetar: ${error.message}`);
    }
  });

  const isImporting = fullImportMutation.isPending || deltaSyncMutation.isPending || importProgress.isRunning;
  const isImageSyncing = imageSyncMutation.isPending || imageStats?.syncProgress?.isRunning;

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
      <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-transparent ${isImporting ? 'ring-2 ring-primary/50' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Importar Catálogo Externo
            {isImporting && !importProgress.isPaused && (
              <Badge variant="default" className="ml-2 bg-primary animate-pulse">
                Em andamento
              </Badge>
            )}
            {importProgress.isPaused && (
              <Badge variant="secondary" className="ml-2">
                <Pause className="h-3 w-3 mr-1" />
                Pausado
              </Badge>
            )}
            {importStatus?.is_stalled && (
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
          {(isImporting || importProgress.page > 0) && (
            <div className={`p-4 rounded-lg border space-y-3 ${importProgress.isPaused ? 'bg-muted/50 border-muted' : 'bg-primary/10 border-primary/20'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isImporting && !importProgress.isPaused ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : importProgress.isPaused ? (
                    <Pause className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-medium text-foreground">
                    {isImporting && !importProgress.isPaused 
                      ? `Importando página ${importProgress.page} de ${importProgress.totalPages || '?'}...`
                      : importProgress.isPaused 
                        ? 'Importação pausada' 
                        : 'Importação concluída'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 font-mono">
                    {importProgress.processed.toLocaleString("pt-BR")} / {importProgress.total.toLocaleString("pt-BR")}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {getElapsedTime()}
                  </Badge>
                </div>
              </div>
              
              <Progress 
                value={importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0} 
                className="h-3" 
              />
              
              <div className="flex flex-wrap justify-between text-xs text-muted-foreground gap-2">
                <span>
                  📄 Página {importProgress.page} / {importProgress.totalPages || '?'}
                </span>
                <span>
                  {importProgress.total > 0 
                    ? `${Math.round((importProgress.processed / importProgress.total) * 100)}% concluído`
                    : 'Calculando...'}
                </span>
                <span>
                  📦 {importStatus?.catalog_size?.toLocaleString("pt-BR") || '...'} no catálogo local
                </span>
              </div>
              
              {/* Estimativa de tempo restante */}
              {importProgress.processed > 0 && importProgress.startTime && importProgress.total > importProgress.processed && (
                <div className="pt-2 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    ⏱️ Estimativa: ~{Math.ceil(
                      ((importProgress.total - importProgress.processed) / importProgress.processed) * 
                      ((Date.now() - importProgress.startTime.getTime()) / 60000)
                    )} min restantes
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Alerta de estado travado */}
          {importStatus?.is_stalled && (
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-foreground">Importação travada detectada</span>
              </div>
              <p className="text-sm text-muted-foreground">
                O processo anterior foi interrompido inesperadamente (página {importStatus.current_page}). 
                Clique em "Resetar" para limpar o estado e iniciar uma nova importação.
              </p>
              <Button
                onClick={resetImportState}
                variant="outline"
                className="gap-2 border-orange-500/50 hover:bg-orange-500/10"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar Estado
              </Button>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            {/* Botão Iniciar/Pausar/Retomar */}
            {!isImporting && !importProgress.isPaused ? (
              <Button
                onClick={startFullImport}
                disabled={isImporting || importStatus?.is_stalled}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Importação Completa
              </Button>
            ) : (
              <Button
                onClick={togglePauseImport}
                variant={importProgress.isPaused ? "default" : "secondary"}
                className="gap-2"
              >
                {importProgress.isPaused ? (
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
              onClick={() => deltaSyncMutation.mutate()}
              disabled={isImporting || importStatus?.is_stalled}
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
          
          {/* Estatísticas detalhadas do Delta Sync */}
          {deltaSyncStats && !isImporting && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-foreground">Delta Sync Concluído</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-green-500">{deltaSyncStats.created}</p>
                  <p className="text-xs text-muted-foreground">Novos</p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-blue-500">{deltaSyncStats.updated}</p>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-orange-500">{deltaSyncStats.deleted}</p>
                  <p className="text-xs text-muted-foreground">Removidos</p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-foreground">{deltaSyncStats.inserted}</p>
                  <p className="text-xs text-muted-foreground">Inseridos no BD</p>
                </div>
              </div>
              {deltaSyncStats.total === 0 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  ✅ Catálogo já está atualizado - nenhuma mudança necessária
                </p>
              )}
            </div>
          )}
          
          {/* Logs de importação */}
          {importLogs.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Logs {isImporting && !importProgress.isPaused && <span className="animate-pulse">(em tempo real)</span>}:
              </p>
              <div className="space-y-1 text-xs font-mono">
                {importLogs.slice(-15).map((log, i) => (
                  <p key={i} className={`${log.includes('❌') ? 'text-destructive' : log.includes('✅') || log.includes('🎉') ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Sincronização de Imagens */}
      <Card className={`border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-transparent ${isImageSyncing ? 'ring-2 ring-blue-500/50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-blue-500" />
                CDN Local de Imagens
                {isImageSyncing && (
                  <Badge variant="default" className="ml-2 bg-blue-500 animate-pulse">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Sincronizando
                  </Badge>
                )}
                {!isImageSyncing && imageStats && imageStats.localCoverage >= 90 && (
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
                disabled={imageStats?.localCoverage && imageStats.localCoverage >= 90}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estatísticas de imagens */}
          {imageStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {imageStats.withLocalImage.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">No CDN Local</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {imageStats.withExternalImage.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">Apenas Externo</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className={`text-2xl font-bold ${imageStats.localCoverage >= 90 ? 'text-green-500' : imageStats.localCoverage >= 50 ? 'text-yellow-500' : 'text-orange-500'}`}>
                  {imageStats.localCoverage}%
                </p>
                <p className="text-xs text-muted-foreground">Cobertura Local</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {imageStats.withoutImage.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">Sem Imagem</p>
              </div>
            </div>
          )}
          
          {/* Progresso da sincronização em tempo real */}
          {imageStats?.syncProgress?.isRunning && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="font-medium text-foreground">Sincronizando imagens em tempo real...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 font-mono">
                    {imageStats.syncProgress.processed.toLocaleString("pt-BR")} / {imageStats.syncProgress.total.toLocaleString("pt-BR")}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    {Math.round((imageStats.syncProgress.processed / imageStats.syncProgress.total) * 100)}%
                  </Badge>
                </div>
              </div>
              
              <Progress 
                value={(imageStats.syncProgress.processed / imageStats.syncProgress.total) * 100} 
                className="h-3" 
              />
              
              <div className="flex flex-wrap justify-between text-xs text-muted-foreground gap-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {imageStats.syncProgress.success.toLocaleString("pt-BR")} sucesso
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  {imageStats.syncProgress.failed.toLocaleString("pt-BR")} falhas
                </span>
                {imageStats.syncProgress.currentMalId && (
                  <span className="font-mono">
                    Processando: MAL #{imageStats.syncProgress.currentMalId}
                  </span>
                )}
              </div>
              
              {/* Tempo estimado */}
              {imageStats.syncProgress.processed > 10 && (
                <div className="pt-2 border-t border-blue-500/20">
                  <p className="text-xs text-muted-foreground">
                    ⏱️ Estimativa: ~{Math.ceil((imageStats.syncProgress.total - imageStats.syncProgress.processed) / (imageStats.syncProgress.processed / ((Date.now() - new Date(imageStats.syncProgress.startedAt || Date.now()).getTime()) / 60000)))} min restantes
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Alerta de estado travado */}
          {imageStats?.isStalled && (
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-foreground">Sincronização travada detectada</span>
              </div>
              <p className="text-sm text-muted-foreground">
                O processo anterior foi interrompido inesperadamente. Clique em "Resetar" para limpar o estado e iniciar uma nova sincronização.
              </p>
              <Button
                onClick={() => resetSyncMutation.mutate()}
                disabled={resetSyncMutation.isPending}
                variant="outline"
                className="gap-2 border-orange-500/50 hover:bg-orange-500/10"
              >
                {resetSyncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Resetar e Continuar
              </Button>
            </div>
          )}
          
          {/* Sincronização concluída recentemente */}
          {!imageStats?.syncProgress?.isRunning && !imageStats?.isStalled && imageStats && imageStats.localCoverage >= 90 && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-foreground">Sincronização completa!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {imageStats.withLocalImage.toLocaleString("pt-BR")} imagens estão armazenadas no CDN local. 
                A cobertura está em {imageStats.localCoverage}%.
              </p>
            </div>
          )}
          
          {/* Botões de ação */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => imageSyncMutation.mutate(undefined)}
              disabled={isImageSyncing}
              variant="outline"
              className="gap-2 border-blue-500/50 hover:bg-blue-500/10"
            >
              {isImageSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              {isImageSyncing ? 'Sincronizando...' : 'Sincronizar Todas'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => imageSyncMutation.mutate(100)}
              disabled={isImageSyncing}
              className="gap-2"
            >
              <Image className="h-4 w-4" />
              Sincronizar 100 (Teste)
            </Button>
            
            {autoSync && !isImageSyncing && imageStats && imageStats.localCoverage < 90 && (
              <Badge variant="outline" className="gap-1.5 text-yellow-600 border-yellow-500/50">
                <Zap className="h-3 w-3" />
                Auto-sync ativo - iniciará automaticamente
              </Badge>
            )}
          </div>
          
          {/* Logs de sincronização de imagens */}
          {imageSyncLogs.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Logs de imagens {isImageSyncing && <span className="animate-pulse">(em tempo real)</span>}:
              </p>
              <div className="space-y-1 text-xs font-mono">
                {imageSyncLogs.slice(-10).map((log, i) => (
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
