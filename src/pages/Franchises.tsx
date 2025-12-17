import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  Filter, 
  Star, 
  Check, 
  PlayCircle, 
  Clock, 
  ChevronDown,
  ChevronRight,
  Film,
  Tv,
  TrendingUp,
  BarChart3,
  Home,
  List
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { 
  groupByFranchise, 
  type FranchiseGroup, 
  type AnimeEntry,
  detectAnimeType
} from '@/lib/franchiseDetector';
import { cn } from '@/lib/utils';

type SortOption = 'name' | 'progress' | 'rating' | 'count';
type FilterOption = 'all' | 'completed' | 'in_progress' | 'not_started';

/**
 * Página dedicada para visualizar franquias do usuário
 */
export default function Franchises() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('count');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [expandedFranchises, setExpandedFranchises] = useState<Set<string>>(new Set());

  const { data: entries, isLoading } = useAnimeEntries();

  // Agrupar por franquia
  const allGroups = useMemo(() => {
    if (!entries) return [];
    const nonArchived = entries.filter(e => !e.is_archived) as AnimeEntry[];
    return groupByFranchise(nonArchived);
  }, [entries]);

  // Filtrar franquias
  const filteredGroups = useMemo(() => {
    let groups = allGroups;

    // Filtro por busca
    if (search) {
      const searchLower = search.toLowerCase();
      groups = groups.filter(g => 
        g.baseName.toLowerCase().includes(searchLower) ||
        g.entries.some(e => e.title.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por status
    if (filterBy === 'completed') {
      groups = groups.filter(g => g.completedCount === g.totalEntries);
    } else if (filterBy === 'in_progress') {
      groups = groups.filter(g => g.watchingCount > 0 || (g.completedCount > 0 && g.completedCount < g.totalEntries));
    } else if (filterBy === 'not_started') {
      groups = groups.filter(g => g.completedCount === 0 && g.watchingCount === 0);
    }

    // Ordenação
    return groups.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.baseName.localeCompare(b.baseName);
        case 'progress':
          return (b.completedCount / b.totalEntries) - (a.completedCount / a.totalEntries);
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'count':
        default:
          return b.totalEntries - a.totalEntries;
      }
    });
  }, [allGroups, search, sortBy, filterBy]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalFranchises = allGroups.length;
    const completedFranchises = allGroups.filter(g => g.completedCount === g.totalEntries).length;
    const inProgressFranchises = allGroups.filter(g => g.watchingCount > 0).length;
    const totalAnimes = allGroups.reduce((acc, g) => acc + g.totalEntries, 0);
    const avgRating = allGroups.filter(g => g.averageRating).reduce((acc, g, _, arr) => acc + (g.averageRating || 0) / arr.length, 0);
    
    return {
      totalFranchises,
      completedFranchises,
      inProgressFranchises,
      totalAnimes,
      avgRating: avgRating.toFixed(1),
    };
  }, [allGroups]);

  // Toggle expansão de franquia
  const toggleExpand = (baseName: string) => {
    setExpandedFranchises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(baseName)) {
        newSet.delete(baseName);
      } else {
        newSet.add(baseName);
      }
      return newSet;
    });
  };

  // Ícone de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'watching':
        return <PlayCircle className="h-3 w-3 text-primary" />;
      case 'paused':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  // Cor do progresso
  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-primary';
    if (progress > 0) return 'bg-yellow-500';
    return 'bg-muted';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/list" className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Início</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/list" className="flex items-center gap-1">
                <List className="h-3.5 w-3.5" />
                Minha Lista
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              Franquias
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Minhas Franquias</h1>
            <p className="text-sm text-muted-foreground">
              {stats.totalFranchises} franquias • {stats.totalAnimes} animes
            </p>
          </div>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFranchises}</p>
                <p className="text-xs text-muted-foreground">Franquias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedFranchises}</p>
                <p className="text-xs text-muted-foreground">Completas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgressFranchises}</p>
                <p className="text-xs text-muted-foreground">Em progresso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgRating}</p>
                <p className="text-xs text-muted-foreground">Nota média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar franquia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="completed">Completas</SelectItem>
            <SelectItem value="in_progress">Em progresso</SelectItem>
            <SelectItem value="not_started">Não iniciadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-40">
            <BarChart3 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Mais animes</SelectItem>
            <SelectItem value="progress">Progresso</SelectItem>
            <SelectItem value="rating">Melhor nota</SelectItem>
            <SelectItem value="name">Nome A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Franquias */}
      {filteredGroups.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
          <div className="space-y-3 pr-4">
            {filteredGroups.map((group) => {
              const isExpanded = expandedFranchises.has(group.baseName);
              const progressPercent = Math.round((group.completedCount / group.totalEntries) * 100);

              return (
                <Card 
                  key={group.baseName} 
                  className="bg-secondary/20 border-border/50 overflow-hidden"
                >
                  {/* Header da Franquia */}
                  <div 
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/40 transition-colors"
                    onClick={() => toggleExpand(group.baseName)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}

                    {/* Primeira imagem */}
                    <img
                      src={group.entries[0]?.image_url || '/placeholder.svg'}
                      alt={group.baseName}
                      className="w-12 h-16 rounded object-cover shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{group.baseName}</h3>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {group.totalEntries} {group.totalEntries === 1 ? 'anime' : 'animes'}
                        </Badge>
                      </div>

                      {/* Barra de progresso */}
                      <div className="flex items-center gap-3 mt-2">
                        <Progress 
                          value={progressPercent} 
                          className="flex-1 h-2"
                        />
                        <span className="text-sm font-medium text-muted-foreground shrink-0">
                          {progressPercent}%
                        </span>
                      </div>

                      {/* Badges de tipo */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {group.types.mainSeries.length > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Tv className="h-3 w-3" />
                            {group.types.mainSeries.length} série{group.types.mainSeries.length > 1 && 's'}
                          </Badge>
                        )}
                        {group.types.seasons.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.types.seasons.length} temp
                          </Badge>
                        )}
                        {group.types.movies.length > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Film className="h-3 w-3" />
                            {group.types.movies.length}
                          </Badge>
                        )}
                        {group.averageRating && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {group.averageRating}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lista expandida de animes */}
                  {isExpanded && (
                    <div className="border-t border-border/30 bg-background/50">
                      {group.entries.map((entry) => {
                        const type = detectAnimeType(entry.title);
                        return (
                          <div 
                            key={entry.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors border-b border-border/20 last:border-0"
                          >
                            <img 
                              src={entry.image_url || '/placeholder.svg'} 
                              alt={entry.title}
                              className="w-10 h-14 rounded object-cover shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(entry.status)}
                                <span className="text-sm font-medium truncate">{entry.title}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {type === 'main' ? 'Série' : type === 'season' ? 'Temporada' : type === 'movie' ? 'Filme' : 'Especial'}
                                </Badge>
                                {entry.episodes_watched !== null && entry.total_episodes && (
                                  <span>{entry.episodes_watched}/{entry.total_episodes} eps</span>
                                )}
                                {entry.rating && (
                                  <span className="flex items-center gap-0.5">
                                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                    {entry.rating}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <Card className="bg-secondary/20 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {search || filterBy !== 'all' 
                ? 'Nenhuma franquia encontrada com esses filtros'
                : 'Adicione animes à sua lista para ver suas franquias'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
