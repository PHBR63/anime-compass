import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { FREEAPI_URL } from "@/lib/apiConfig";
import { formatRelativeTime } from '@/lib/dateUtils';

/**
 * Interface para estatísticas do catálogo
 */
interface EstatisticasCatalogo {
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
 * Busca estatísticas completas do catálogo
 */
async function buscarEstatisticasCatalogo(): Promise<EstatisticasCatalogo> {
  const statsResponse = await fetch(`${FREEAPI_URL}?action=stats`);
  if (!statsResponse.ok) throw new Error("Falha ao buscar estatísticas");
  const statsData = await statsResponse.json();

  const ptResponse = await fetch(`${FREEAPI_URL}?limit=1&has_synopsis_pt=true`);
  const ptData = await ptResponse.json();

  return {
    ...statsData.data,
    with_synopsis_pt: ptData.pagination?.total || 0
  };
}

/**
 * Busca gêneros do catálogo para gráfico de barras
 */
async function buscarGenerosCatalogo(): Promise<{ name: string; count: number }[]> {
  const response = await fetch(`${FREEAPI_URL}?action=genres`);
  if (!response.ok) throw new Error('Falha ao buscar gêneros');
  const result = await response.json();
  if (!result.success) throw new Error(result.error?.message || 'Erro desconhecido');
  return result.data;
}

/** Cores para gráfico de pizza por tipo */
const CORES_TIPO: Record<string, string> = {
  'TV': '#3b82f6',
  'Movie': '#8b5cf6',
  'OVA': '#ec4899',
  'ONA': '#f97316',
  'Special': '#22c55e',
};

/** Cores para gráfico de pizza por status */
const CORES_STATUS: Record<string, string> = {
  'Finished Airing': '#22c55e',
  'Currently Airing': '#3b82f6',
  'Not yet aired': '#f59e0b',
};

/** Labels traduzidos */
const LABELS_TIPO: Record<string, string> = {
  'TV': 'TV', 'Movie': 'Filme', 'OVA': 'OVA', 'ONA': 'ONA',
  'Special': 'Especial', 'Music': 'Música',
};

const LABELS_STATUS: Record<string, string> = {
  'Finished Airing': 'Finalizado',
  'Currently Airing': 'Em Exibição',
  'Not yet aired': 'Não Lançado',
};

/** Retorna ícone apropriado para tipo de anime */
function obterIconeTipo(type: string) {
  switch (type) {
    case "TV": return Tv;
    case "Movie": return Film;
    case "OVA": case "ONA": return Clapperboard;
    case "Music": return Music;
    default: return Star;
  }
}

/**
 * Card de estatística individual reutilizável
 */
function CardEstatistica({
  titulo,
  valor,
  icon: Icon,
  descricao,
  tendencia
}: {
  titulo: string;
  valor: string | number;
  icon: React.ElementType;
  descricao?: string;
  tendencia?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{titulo}</p>
            <p className="text-2xl font-bold text-foreground">
              {typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}
            </p>
            {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {tendencia && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Barra de progresso com label
 */
function BarraProgresso({ label, valor, total }: { label: string; valor: number; total: number }) {
  const porcentagem = total > 0 ? (valor / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {valor.toLocaleString("pt-BR")} / {total.toLocaleString("pt-BR")} ({porcentagem.toFixed(1)}%)
        </span>
      </div>
      <Progress value={porcentagem} className="h-2" />
    </div>
  );
}

/**
 * Componente de visão geral do catálogo
 * Combina estatísticas + gráficos (substitui FreeApiStatus stats + CatalogStats)
 */
export function CatalogOverview() {
  const [atualizando, setAtualizando] = useState(false);

  const { data: stats, isLoading: carregandoStats, error, refetch } = useQuery({
    queryKey: ["freeapi-stats"],
    queryFn: buscarEstatisticasCatalogo,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: generos, isLoading: carregandoGeneros } = useQuery({
    queryKey: ['catalog-genres'],
    queryFn: buscarGenerosCatalogo,
    staleTime: 5 * 60 * 1000,
  });

  const carregando = carregandoStats || carregandoGeneros;

  /** Atualiza dados manualmente */
  const atualizarDados = async () => {
    setAtualizando(true);
    await refetch();
    setAtualizando(false);
  };

  if (carregando) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

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
          <Button onClick={atualizarDados} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Percentuais
  const porcentagemImagens = stats.total_anime > 0
    ? ((stats.with_images / stats.total_anime) * 100).toFixed(1)
    : "0";
  const porcentagemSinopses = stats.total_anime > 0
    ? ((stats.with_synopsis_pt / stats.total_anime) * 100).toFixed(1)
    : "0";
  const ultimaSyncTexto = stats.last_sync ? formatRelativeTime(stats.last_sync) : "Nunca";

  // Dados para gráficos
  const dadosTipo = stats.by_type
    ? Object.entries(stats.by_type)
        .filter(([key]) => key && key !== 'null')
        .map(([name, value]) => ({
          name: LABELS_TIPO[name] || name,
          value,
          color: CORES_TIPO[name] || '#6b7280',
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const dadosStatus = stats.by_status
    ? Object.entries(stats.by_status)
        .filter(([key]) => key && key !== 'null')
        .map(([name, value]) => ({
          name: LABELS_STATUS[name] || name,
          value,
          color: CORES_STATUS[name] || '#6b7280',
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const dadosGeneros = generos
    ? generos.slice(0, 15).map(g => ({ name: g.name, count: g.count }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Visão Geral do Catálogo</h2>
            <p className="text-sm text-muted-foreground">Estatísticas e cobertura de dados</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Clock className="h-3 w-3" />
            Atualizado {ultimaSyncTexto}
          </Badge>
          <Button variant="outline" size="sm" onClick={atualizarDados} disabled={atualizando}>
            {atualizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardEstatistica
          titulo="Total de Animes"
          valor={stats.total_anime}
          icon={Database}
          descricao={`Anos: ${stats.year_range?.min || "N/A"} - ${stats.year_range?.max || "N/A"}`}
          tendencia="up"
        />
        <CardEstatistica
          titulo="Com Imagens"
          valor={`${porcentagemImagens}%`}
          icon={Image}
          descricao={`${stats.with_images.toLocaleString("pt-BR")} animes`}
        />
        <CardEstatistica
          titulo="Sinopses PT-BR"
          valor={`${porcentagemSinopses}%`}
          icon={Languages}
          descricao={`${stats.with_synopsis_pt.toLocaleString("pt-BR")} traduzidas`}
        />
        <CardEstatistica
          titulo="Última Sync"
          valor={ultimaSyncTexto}
          icon={Clock}
          descricao={stats.last_sync ? new Date(stats.last_sync).toLocaleString("pt-BR") : "Nunca"}
        />
      </div>

      {/* Gráficos de pizza (Tipo e Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="h-5 w-5 text-primary" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosTipo}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {dadosTipo.map((entry, index) => (
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
              <TrendingUp className="h-5 w-5 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {dadosStatus.map((entry, index) => (
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

      {/* Distribuição por tipo (barras de progresso) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              Detalhamento por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.by_type && Object.entries(stats.by_type)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const Icon = obterIconeTipo(type);
                const percentage = ((count / stats.total_anime) * 100).toFixed(1);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{LABELS_TIPO[type] || type}</span>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Detalhamento por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.by_status && Object.entries(stats.by_status)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const percentage = ((count / stats.total_anime) * 100).toFixed(1);
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
                        <span className="font-medium">{LABELS_STATUS[status] || status}</span>
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

      {/* Top 15 Gêneros */}
      {dadosGeneros.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 15 Gêneros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGeneros} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => value.toLocaleString('pt-BR')}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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
          <BarraProgresso label="Imagens de Capa" valor={stats.with_images} total={stats.total_anime} />
          <BarraProgresso label="Sinopses em Português" valor={stats.with_synopsis_pt} total={stats.total_anime} />
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.year_range?.min || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Ano mais antigo</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.year_range?.max || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Ano mais recente</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.score_range?.min?.toFixed(1) || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Nota mínima</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.score_range?.max?.toFixed(1) || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Nota máxima</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
