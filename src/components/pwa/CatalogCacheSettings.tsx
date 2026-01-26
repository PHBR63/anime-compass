/**
 * Componente de configurações do cache do catálogo de animes
 * Mostra estatísticas e permite limpar o cache IndexedDB
 */

import { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, Loader2, HardDrive, Cloud, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getCatalogCacheStats, cleanExpiredCatalogCache } from '@/lib/offlineCache';
import { formatRelativeTime } from '@/lib/dateUtils';

interface CacheStats {
  totalEntries: number;
  catalogCount: number;
  jikanCount: number;
  oldestEntry: number | null;
}

/**
 * Card de configurações do cache do catálogo
 */
export function CatalogCacheSettings() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Carrega estatísticas ao montar o componente
  useEffect(() => {
    loadStats();
  }, []);

  /**
   * Carrega estatísticas do cache
   */
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const cacheStats = await getCatalogCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('[CatalogCacheSettings] Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Limpa entradas expiradas do cache
   */
  const handleCleanExpired = async () => {
    setIsClearing(true);
    try {
      const deletedCount = await cleanExpiredCatalogCache();
      toast.success(`${deletedCount} entradas expiradas removidas`);
      await loadStats();
    } catch (error) {
      console.error('[CatalogCacheSettings] Erro ao limpar cache:', error);
      toast.error('Erro ao limpar cache expirado');
    } finally {
      setIsClearing(false);
    }
  };

  /**
   * Limpa todo o cache do catálogo
   */
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      // Limpar todo o cache (TTL = 0)
      const deletedCount = await cleanExpiredCatalogCache(0);
      toast.success(`Cache limpo! ${deletedCount} animes removidos`);
      await loadStats();
    } catch (error) {
      console.error('[CatalogCacheSettings] Erro ao limpar todo o cache:', error);
      toast.error('Erro ao limpar cache');
    } finally {
      setIsClearing(false);
    }
  };

  /**
   * Calcula a porcentagem de cada fonte
   */
  const getCatalogPercentage = () => {
    if (!stats || stats.totalEntries === 0) return 0;
    return Math.round((stats.catalogCount / stats.totalEntries) * 100);
  };

  /**
   * Formata a data da entrada mais antiga
   */
  const getOldestEntryText = () => {
    if (!stats?.oldestEntry) return 'Nenhum dado';
    return formatRelativeTime(new Date(stats.oldestEntry));
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Cache de Animes
        </CardTitle>
        <CardDescription className="text-sm">
          Dados de animes salvos localmente para acesso rápido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Estatísticas gerais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total em cache</span>
                </div>
                <p className="text-xl font-bold">{stats?.totalEntries || 0}</p>
                <p className="text-xs text-muted-foreground">animes salvos</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Mais antigo</span>
                </div>
                <p className="text-sm font-medium">{getOldestEntryText()}</p>
                <p className="text-xs text-muted-foreground">7 dias de validade</p>
              </div>
            </div>

            {/* Barra de proporção de fontes */}
            {stats && stats.totalEntries > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Distribuição por fonte</span>
                  <span className="text-muted-foreground">{getCatalogPercentage()}% catálogo</span>
                </div>
                <Progress value={getCatalogPercentage()} className="h-2" />
                
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Catálogo: {stats.catalogCount}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Jikan: {stats.jikanCount}
                  </Badge>
                </div>
              </div>
            )}

            {/* Informação sobre o cache */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p>O cache armazena dados de animes para acesso offline e carregamento mais rápido.</p>
                  <p className="mt-1">Dados expiram automaticamente após 7 dias.</p>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanExpired}
                disabled={isClearing || !stats?.totalEntries}
                className="flex-1"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Limpar expirados
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={isClearing || !stats?.totalEntries}
                className="flex-1 text-destructive hover:text-destructive"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Limpar tudo
              </Button>
            </div>

            {/* Botão de atualizar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStats}
              disabled={isLoading}
              className="w-full text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar estatísticas
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
