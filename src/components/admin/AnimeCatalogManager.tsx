import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  Database, 
  Image, 
  Clock, 
  TrendingUp, 
  Calendar,
  Play,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BarChart3,
  Film,
  Radio,
  Zap,
  Timer,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Interface para estatísticas do catálogo
 */
interface CatalogStats {
  total_anime: number;
  with_images: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  year_range: { min: number; max: number };
  score_range: { min: number; max: number };
}

/**
 * Interface para logs de sincronização
 */
interface SyncLog {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

/**
 * Interface para status do cron job
 */
interface CronJobStatus {
  active: boolean;
  schedule: string;
  lastRun?: {
    status: string;
    startTime: string;
    endTime: string;
  };
}

/**
 * Componente para gerenciar sincronização do catálogo de animes
 * Inclui monitoramento em tempo real
 */
export function AnimeCatalogManager() {
  const queryClient = useQueryClient();
  const [syncMode, setSyncMode] = useState<'top' | 'season' | 'update'>('top');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10); // segundos
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Buscar estatísticas do catálogo em tempo real
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'catalog-stats'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anime-api?action=stats`
      );
      
      if (!response.ok) throw new Error('Erro ao buscar estatísticas');
      
      const result = await response.json();
      setLastRefresh(new Date());
      return result.data as CatalogStats;
    },
    staleTime: 1000 * 5, // 5 segundos
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Buscar contagem direta do banco para precisão em tempo real
  const { data: realtimeCount, refetch: refetchCount } = useQuery({
    queryKey: ['admin', 'catalog-realtime-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('anime_catalog')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 5,
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Buscar últimos animes sincronizados
  const { data: recentAnimes, refetch: refetchRecent } = useQuery({
    queryKey: ['admin', 'recent-synced-animes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime_catalog')
        .select('title, image_url, score, last_synced_at, mal_id')
        .order('last_synced_at', { ascending: false })
        .limit(5);

      if (error) return [];
      return data;
    },
    staleTime: 1000 * 5,
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Buscar estatísticas de sincronização por hora
  const { data: syncActivity } = useQuery({
    queryKey: ['admin', 'sync-activity'],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('anime_catalog')
        .select('last_synced_at')
        .gte('last_synced_at', oneHourAgo);

      if (error) return { count: 0, lastHour: 0 };
      
      return {
        count: data.length,
        lastHour: data.length
      };
    },
    staleTime: 1000 * 30,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Mutation para executar sincronização manual
  const syncMutation = useMutation({
    mutationFn: async (mode: 'top' | 'season' | 'update') => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-anime-catalog`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            mode,
            batch_size: mode === 'update' ? 50 : 25,
            trigger: 'manual',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro na sincronização');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Sincronização concluída!`, {
        description: `Processados: ${data.data?.stats?.fetched || 0} animes`,
      });
      // Invalidar queries para atualizar dados
      refetchStats();
      refetchCount();
      refetchRecent();
    },
    onError: (error: Error) => {
      toast.error('Erro na sincronização', {
        description: error.message,
      });
    },
  });

  // Refresh manual
  const handleManualRefresh = () => {
    refetchStats();
    refetchCount();
    refetchRecent();
    setLastRefresh(new Date());
    toast.success('Dados atualizados!');
  };

  // Calcular porcentagem de imagens
  const imagePercentage = stats 
    ? Math.round((stats.with_images / stats.total_anime) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Painel de monitoramento em tempo real */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle>Monitoramento em Tempo Real</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-sm">
                  Auto-refresh ({refreshInterval}s)
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
          <CardDescription>
            Última atualização: {format(lastRefresh, "HH:mm:ss", { locale: ptBR })}
            {autoRefresh && (
              <span className="ml-2 text-primary">
                • Atualizando automaticamente
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total em tempo real */}
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Database className="h-4 w-4" />
                <span className="text-xs">Total no Catálogo</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {realtimeCount?.toLocaleString('pt-BR') || '...'}
              </p>
            </div>

            {/* Sincronizados na última hora */}
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Última Hora</span>
              </div>
              <p className="text-3xl font-bold text-green-500">
                +{syncActivity?.lastHour || 0}
              </p>
            </div>

            {/* Com imagem */}
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Image className="h-4 w-4" />
                <span className="text-xs">Com Imagem</span>
              </div>
              <p className="text-3xl font-bold">
                {imagePercentage}%
              </p>
            </div>

            {/* Status do cron */}
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Timer className="h-4 w-4" />
                <span className="text-xs">Cron Job</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  <Zap className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
                <span className="text-xs text-muted-foreground">5min</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Últimos animes sincronizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Últimos Animes Sincronizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAnimes && recentAnimes.length > 0 ? (
            <div className="space-y-3">
              {recentAnimes.map((anime) => (
                <div 
                  key={anime.mal_id} 
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  {anime.image_url && (
                    <img 
                      src={anime.image_url} 
                      alt={anime.title}
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{anime.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {anime.score && (
                        <Badge variant="secondary" className="text-xs">
                          ⭐ {anime.score}
                        </Badge>
                      )}
                      <span>MAL #{anime.mal_id}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {anime.last_synced_at && formatDistanceToNow(new Date(anime.last_synced_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Carregando...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de animes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Animes</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.total_anime?.toLocaleString('pt-BR') || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              animes no catálogo local
            </p>
          </CardContent>
        </Card>

        {/* Imagens disponíveis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Com Imagens</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${imagePercentage}%`
              )}
            </div>
            <Progress value={imagePercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.with_images?.toLocaleString('pt-BR') || 0} com imagem local
            </p>
          </CardContent>
        </Card>

        {/* Range de anos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Anos Cobertos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : stats?.year_range ? (
                `${stats.year_range.min} - ${stats.year_range.max}`
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              período de lançamento
            </p>
          </CardContent>
        </Card>

        {/* Score range */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Range de Notas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : stats?.score_range ? (
                `${stats.score_range.min?.toFixed(1)} - ${stats.score_range.max?.toFixed(1)}`
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              notas no catálogo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Painel de controle de sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sincronização Manual
          </CardTitle>
          <CardDescription>
            Execute sincronização manual do catálogo. O cron job automático está ativo (a cada 5 minutos).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modos de sincronização */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={syncMode === 'top' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSyncMode('top')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Top Animes
            </Button>
            <Button
              variant={syncMode === 'season' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSyncMode('season')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Temporada Atual
            </Button>
            <Button
              variant={syncMode === 'update' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSyncMode('update')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Existentes
            </Button>
          </div>

          {/* Descrição do modo selecionado */}
          <div className="p-3 rounded-lg bg-muted/50">
            {syncMode === 'top' && (
              <p className="text-sm text-muted-foreground">
                <strong>Top Animes:</strong> Busca os animes mais bem avaliados e populares do MyAnimeList.
                Ideal para popular o catálogo inicialmente.
              </p>
            )}
            {syncMode === 'season' && (
              <p className="text-sm text-muted-foreground">
                <strong>Temporada Atual:</strong> Busca os animes da temporada atual.
                Mantém o catálogo atualizado com lançamentos recentes.
              </p>
            )}
            {syncMode === 'update' && (
              <p className="text-sm text-muted-foreground">
                <strong>Atualizar Existentes:</strong> Atualiza animes que não foram sincronizados nas últimas 24h.
                Mantém scores e episódios atualizados.
              </p>
            )}
          </div>

          {/* Botão de sincronização */}
          <Button
            onClick={() => syncMutation.mutate(syncMode)}
            disabled={syncMutation.isPending}
            className="w-full sm:w-auto"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar Sincronização
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Estatísticas por tipo e status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stats?.by_type ? (
              <div className="space-y-3">
                {Object.entries(stats.by_type)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{type || 'Desconhecido'}</Badge>
                      </div>
                      <span className="text-sm font-medium">
                        {count.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>

        {/* Por status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stats?.by_status ? (
              <div className="space-y-3">
                {Object.entries(stats.by_status)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={status === 'Currently Airing' ? 'default' : 'secondary'}
                        >
                          {status || 'Desconhecido'}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">
                        {count.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
