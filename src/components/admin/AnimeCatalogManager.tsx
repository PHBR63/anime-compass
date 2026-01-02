import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  Database, 
  Image, 
  Clock, 
  TrendingUp, 
  Calendar,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BarChart3,
  Film
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
 * Componente para gerenciar sincronização do catálogo de animes
 */
export function AnimeCatalogManager() {
  const queryClient = useQueryClient();
  const [syncMode, setSyncMode] = useState<'top' | 'season' | 'update'>('top');

  // Buscar estatísticas do catálogo
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'catalog-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('anime-api', {
        body: null,
        method: 'GET',
      });

      // Fazer chamada para action=stats
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anime-api?action=stats`
      );
      
      if (!response.ok) throw new Error('Erro ao buscar estatísticas');
      
      const result = await response.json();
      return result.data as CatalogStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Buscar último anime sincronizado
  const { data: lastSyncedAnime } = useQuery({
    queryKey: ['admin', 'last-synced-anime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime_catalog')
        .select('title, last_synced_at')
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return data;
    },
    staleTime: 1000 * 60, // 1 minuto
  });

  // Buscar logs de sincronização recentes
  const { data: syncLogs } = useQuery({
    queryKey: ['admin', 'sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'anime_catalog')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) return [];
      return data as SyncLog[];
    },
    staleTime: 1000 * 60, // 1 minuto
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
      toast.success(`Sincronização iniciada!`, {
        description: `Processando ${data.data?.processed || 0} animes...`,
      });
      // Invalidar queries para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['admin', 'catalog-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'last-synced-anime'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sync-logs'] });
    },
    onError: (error: Error) => {
      toast.error('Erro na sincronização', {
        description: error.message,
      });
    },
  });

  // Calcular porcentagem de imagens
  const imagePercentage = stats 
    ? Math.round((stats.with_images / stats.total_anime) * 100) 
    : 0;

  return (
    <div className="space-y-6">
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

        {/* Última sincronização */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Última Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastSyncedAnime?.last_synced_at ? (
                formatDistanceToNow(new Date(lastSyncedAnime.last_synced_at), {
                  addSuffix: true,
                  locale: ptBR,
                })
              ) : (
                'Nunca'
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {lastSyncedAnime?.title || 'Nenhum anime sincronizado'}
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
            Execute sincronização manual do catálogo. A sincronização automática ocorre a cada 2 horas.
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

      {/* Logs de sincronização recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
          <CardDescription>
            Últimas atualizações no catálogo de animes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs && syncLogs.length > 0 ? (
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {log.action === 'INSERT' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : log.action === 'UPDATE' ? (
                      <RefreshCw className="h-4 w-4 text-blue-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {log.action === 'INSERT' ? 'Novo anime' : 'Atualização'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(log.new_data as any)?.title || 'Anime desconhecido'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma atividade recente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
