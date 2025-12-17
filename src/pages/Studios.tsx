import { useState, useMemo } from "react";
import { useAnimeEntries } from "@/hooks/useAnimeEntries";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LazyImage } from "@/components/ui/lazy-image";
import { 
  Search, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  Star,
  CheckCircle2,
  Play,
  Pause,
  Clock,
  Filter,
  SortAsc,
  BarChart3,
  Trophy,
  TrendingUp
} from "lucide-react";
import { fetchWithRateLimit } from "@/lib/jikanRateLimiter";
import { jikanCache, cacheKeys, CACHE_TTL } from "@/lib/jikanCache";

// Interface para dados do estúdio
interface StudioData {
  name: string;
  animes: Array<{
    mal_id: number;
    title: string;
    image_url: string | null;
    status: string;
    rating: number | null;
    episodes_watched: number | null;
    total_episodes: number | null;
  }>;
  totalAnimes: number;
  completedAnimes: number;
  watchingAnimes: number;
  averageRating: number;
  totalEpisodes: number;
  watchedEpisodes: number;
}

/**
 * Função para buscar detalhes do anime da API Jikan
 */
const fetchAnimeDetails = async (malId: number) => {
  const cacheKey = cacheKeys.animeDetails(malId);
  const cached = jikanCache.get<{ data: { studios: { name: string }[] } }>(cacheKey);
  
  if (cached) {
    return cached.data;
  }

  const response = await fetchWithRateLimit(`https://api.jikan.moe/v4/anime/${malId}`);
  if (!response.ok) {
    throw new Error(`Erro ao buscar anime ${malId}`);
  }
  
  const result = await response.json();
  jikanCache.set(cacheKey, result, CACHE_TTL.ANIME_DETAILS);
  
  return result.data;
};

// Componente para exibir um estúdio
const StudioCard = ({ studio, isExpanded, onToggle }: { 
  studio: StudioData; 
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const completionPercentage = studio.totalAnimes > 0 
    ? (studio.completedAnimes / studio.totalAnimes) * 100 
    : 0;

  const episodePercentage = studio.totalEpisodes > 0
    ? (studio.watchedEpisodes / studio.totalEpisodes) * 100
    : 0;

  // Ícone de status para cada anime
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'watching': return <Play className="h-3 w-3 text-blue-500" />;
      case 'paused': return <Pause className="h-3 w-3 text-yellow-500" />;
      case 'dropped': return <Clock className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
      <CardHeader 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{studio.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {studio.totalAnimes} anime{studio.totalAnimes !== 1 ? 's' : ''} na sua lista
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Estatísticas rápidas */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{studio.completedAnimes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Play className="h-4 w-4 text-blue-500" />
                <span>{studio.watchingAnimes}</span>
              </div>
              {studio.averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>{studio.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso de conclusão</span>
            <span>{completionPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </CardHeader>

      {/* Lista de animes expandida */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            {/* Stats detalhados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-accent/30">
                <p className="text-lg font-bold text-primary">{studio.totalAnimes}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-green-500/10">
                <p className="text-lg font-bold text-green-500">{studio.completedAnimes}</p>
                <p className="text-xs text-muted-foreground">Completos</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-500/10">
                <p className="text-lg font-bold text-blue-500">{studio.watchingAnimes}</p>
                <p className="text-xs text-muted-foreground">Assistindo</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                <p className="text-lg font-bold text-yellow-500">
                  {studio.averageRating > 0 ? studio.averageRating.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Nota Média</p>
              </div>
            </div>

            {/* Progresso de episódios */}
            <div className="mb-4 p-3 rounded-lg bg-accent/20">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Episódios assistidos</span>
                <span className="font-medium">
                  {studio.watchedEpisodes} / {studio.totalEpisodes || '?'}
                </span>
              </div>
              <Progress value={episodePercentage} className="h-2" />
            </div>

            {/* Lista de animes */}
            <div className="space-y-2">
              {studio.animes.map((anime) => (
                <div 
                  key={anime.mal_id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <LazyImage
                    src={anime.image_url || '/placeholder.svg'}
                    alt={anime.title}
                    className="w-10 h-14 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{anime.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getStatusIcon(anime.status)}
                      <span className="capitalize">
                        {anime.status === 'not_started' ? 'Não iniciado' :
                         anime.status === 'watching' ? 'Assistindo' :
                         anime.status === 'completed' ? 'Completo' :
                         anime.status === 'paused' ? 'Pausado' :
                         anime.status === 'dropped' ? 'Dropado' : anime.status}
                      </span>
                      {anime.episodes_watched !== null && (
                        <>
                          <span>•</span>
                          <span>
                            {anime.episodes_watched}/{anime.total_episodes || '?'} eps
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {anime.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{anime.rating}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

/**
 * Página de Estúdios - Exibe todos os animes do usuário agrupados por estúdio de produção
 */
const Studios = () => {
  const { data: entries, isLoading: entriesLoading } = useAnimeEntries();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "count" | "rating" | "completion">("count");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "watching" | "partial">("all");
  const [expandedStudios, setExpandedStudios] = useState<Set<string>>(new Set());

  // Buscar informações dos estúdios para cada anime
  const { data: studioData, isLoading: studiosLoading } = useQuery({
    queryKey: ['studios', entries?.map(e => e.mal_id)],
    queryFn: async () => {
      if (!entries || entries.length === 0) return [];

      const studioMap = new Map<string, StudioData>();
      
      // Processar em lotes para evitar rate limiting
      const batchSize = 3;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (entry) => {
          try {
            const animeData = await fetchAnimeDetails(entry.mal_id);
            
            if (animeData?.studios && animeData.studios.length > 0) {
              for (const studio of animeData.studios) {
                const studioName = studio.name;
                
                if (!studioMap.has(studioName)) {
                  studioMap.set(studioName, {
                    name: studioName,
                    animes: [],
                    totalAnimes: 0,
                    completedAnimes: 0,
                    watchingAnimes: 0,
                    averageRating: 0,
                    totalEpisodes: 0,
                    watchedEpisodes: 0
                  });
                }
                
                const studioEntry = studioMap.get(studioName)!;
                studioEntry.animes.push({
                  mal_id: entry.mal_id,
                  title: entry.title,
                  image_url: entry.image_url,
                  status: entry.status,
                  rating: entry.rating,
                  episodes_watched: entry.episodes_watched,
                  total_episodes: entry.total_episodes
                });
                studioEntry.totalAnimes++;
                
                if (entry.status === 'completed') studioEntry.completedAnimes++;
                if (entry.status === 'watching') studioEntry.watchingAnimes++;
                
                studioEntry.watchedEpisodes += entry.episodes_watched || 0;
                studioEntry.totalEpisodes += entry.total_episodes || 0;
              }
            }
          } catch (error) {
            console.error(`Erro ao buscar dados do anime ${entry.mal_id}:`, error);
          }
        }));
        
        // Delay entre lotes para evitar rate limiting
        if (i + batchSize < entries.length) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
      
      // Calcular média de ratings
      studioMap.forEach((studio) => {
        const ratedAnimes = studio.animes.filter(a => a.rating !== null);
        if (ratedAnimes.length > 0) {
          studio.averageRating = ratedAnimes.reduce((sum, a) => sum + (a.rating || 0), 0) / ratedAnimes.length;
        }
      });
      
      return Array.from(studioMap.values());
    },
    enabled: !!entries && entries.length > 0,
    staleTime: 1000 * 60 * 30,
  });

  // Filtrar e ordenar estúdios
  const filteredStudios = useMemo(() => {
    if (!studioData) return [];
    
    let filtered = studioData.filter(studio => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = studio.name.toLowerCase().includes(search);
        const matchesAnime = studio.animes.some(a => a.title.toLowerCase().includes(search));
        if (!matchesName && !matchesAnime) return false;
      }
      
      if (filterStatus === "completed") {
        return studio.completedAnimes === studio.totalAnimes;
      }
      if (filterStatus === "watching") {
        return studio.watchingAnimes > 0;
      }
      if (filterStatus === "partial") {
        return studio.completedAnimes > 0 && studio.completedAnimes < studio.totalAnimes;
      }
      
      return true;
    });
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "count":
          return b.totalAnimes - a.totalAnimes;
        case "rating":
          return b.averageRating - a.averageRating;
        case "completion":
          const aCompletion = a.totalAnimes > 0 ? a.completedAnimes / a.totalAnimes : 0;
          const bCompletion = b.totalAnimes > 0 ? b.completedAnimes / b.totalAnimes : 0;
          return bCompletion - aCompletion;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [studioData, searchTerm, sortBy, filterStatus]);

  const toggleStudio = (studioName: string) => {
    setExpandedStudios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studioName)) {
        newSet.delete(studioName);
      } else {
        newSet.add(studioName);
      }
      return newSet;
    });
  };

  const stats = useMemo(() => {
    if (!studioData) return { totalStudios: 0, topStudio: null, avgPerStudio: 0 };
    
    const topStudio = studioData.reduce((top, studio) => 
      studio.totalAnimes > (top?.totalAnimes || 0) ? studio : top
    , null as StudioData | null);
    
    const avgPerStudio = studioData.length > 0 
      ? studioData.reduce((sum, s) => sum + s.totalAnimes, 0) / studioData.length 
      : 0;
    
    return {
      totalStudios: studioData.length,
      topStudio,
      avgPerStudio
    };
  }, [studioData]);

  const isLoading = entriesLoading || studiosLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          Estúdios
        </h1>
        <p className="text-muted-foreground mt-1">
          Seus animes organizados por estúdio de produção
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudios}</p>
                <p className="text-xs text-muted-foreground">Estúdios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-bold truncate" title={stats.topStudio?.name}>
                  {stats.topStudio?.name || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Mais Assistido</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgPerStudio.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Média/Estúdio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entries?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Animes</p>
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
            placeholder="Buscar estúdio ou anime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">100% Completos</SelectItem>
            <SelectItem value="watching">Assistindo</SelectItem>
            <SelectItem value="partial">Parcialmente</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Mais Animes</SelectItem>
            <SelectItem value="name">Nome A-Z</SelectItem>
            <SelectItem value="rating">Melhor Avaliado</SelectItem>
            <SelectItem value="completion">Mais Completo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expandir/Recolher todos */}
      {filteredStudios.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedStudios(new Set(filteredStudios.map(s => s.name)))}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Expandir Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedStudios(new Set())}
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Recolher Todos
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted" />
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de estúdios */}
      {!isLoading && filteredStudios.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum estúdio encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Adicione animes à sua lista para ver os estúdios"}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredStudios.length > 0 && (
        <div className="space-y-4">
          {filteredStudios.map((studio) => (
            <StudioCard
              key={studio.name}
              studio={studio}
              isExpanded={expandedStudios.has(studio.name)}
              onToggle={() => toggleStudio(studio.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Studios;
