import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Database, Film, Play, Calendar, Star, Image, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Interface para estatísticas do catálogo
 */
interface CatalogStatsData {
  total_anime: number;
  with_images: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_genre?: Record<string, number>;
  year_range: { min: number; max: number };
  score_range: { min: number; max: number };
  last_sync?: string | null;
}

/**
 * Cores para os gráficos de pizza
 */
const TYPE_COLORS = {
  'TV': '#3b82f6',
  'Movie': '#8b5cf6',
  'OVA': '#ec4899',
  'ONA': '#f97316',
  'Special': '#22c55e',
} as Record<string, string>;

const STATUS_COLORS = {
  'Finished Airing': '#22c55e',
  'Currently Airing': '#3b82f6',
  'Not yet aired': '#f59e0b',
} as Record<string, string>;

/**
 * Labels traduzidos para tipos e status
 */
const TYPE_LABELS: Record<string, string> = {
  'TV': 'TV',
  'Movie': 'Filme',
  'OVA': 'OVA',
  'ONA': 'ONA',
  'Special': 'Especial',
};

const STATUS_LABELS: Record<string, string> = {
  'Finished Airing': 'Finalizado',
  'Currently Airing': 'Em exibição',
  'Not yet aired': 'Não lançado',
};

/**
 * Hook para buscar estatísticas do catálogo
 */
function useCatalogStats() {
  return useQuery({
    queryKey: ['catalog-stats'],
    queryFn: async (): Promise<CatalogStatsData> => {
      // Buscar estatísticas via edge function
      const { data, error } = await supabase.functions.invoke('anime-api', {
        method: 'GET',
        body: null,
      });
      
      // A função não suporta body em GET, precisamos usar fetch direto
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anime-api?action=stats`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Falha ao buscar estatísticas');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar gêneros do catálogo
 */
function useCatalogGenres() {
  return useQuery({
    queryKey: ['catalog-genres'],
    queryFn: async (): Promise<{ name: string; count: number }[]> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anime-api?action=genres`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Falha ao buscar gêneros');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Componente de estatísticas do catálogo
 */
export function CatalogStats() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useCatalogStats();
  const { data: genres, isLoading: genresLoading } = useCatalogGenres();
  
  const isLoading = statsLoading || genresLoading;

  // Preparar dados para gráficos
  const typeData = stats?.by_type 
    ? Object.entries(stats.by_type)
        .filter(([key]) => key && key !== 'null')
        .map(([name, value]) => ({
          name: TYPE_LABELS[name] || name,
          value,
          color: TYPE_COLORS[name] || '#6b7280',
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const statusData = stats?.by_status
    ? Object.entries(stats.by_status)
        .filter(([key]) => key && key !== 'null')
        .map(([name, value]) => ({
          name: STATUS_LABELS[name] || name,
          value,
          color: STATUS_COLORS[name] || '#6b7280',
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const genreData = genres
    ? genres.slice(0, 15).map(g => ({
        name: g.name,
        count: g.count,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com atualização */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Estatísticas do Catálogo</h2>
          {stats?.last_sync && (
            <p className="text-sm text-muted-foreground">
              Última sincronização: {format(new Date(stats.last_sync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Animes
            </CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.total_anime?.toLocaleString('pt-BR') || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com Imagens
            </CardTitle>
            <Image className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.with_images?.toLocaleString('pt-BR') || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats?.total_anime ? Math.round((stats.with_images / stats.total_anime) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Período
            </CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.year_range?.min || '?'} - {stats?.year_range?.max || '?'}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats?.year_range ? (stats.year_range.max - stats.year_range.min + 1) : 0} anos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faixa de Nota
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.score_range?.min?.toFixed(1) || '0'} - {stats?.score_range?.max?.toFixed(1) || '10'}
            </p>
            <p className="text-xs text-muted-foreground">
              Média das notas MAL
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Tipo e Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="h-5 w-5" />
              Por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString('pt-BR')}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="h-5 w-5" />
              Por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString('pt-BR')}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Gêneros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 15 Gêneros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genreData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString('pt-BR')}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  name="Quantidade"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
