/**
 * Componente para pré-carregar animes da lista do usuário para modo offline
 * Salva dados no IndexedDB para acesso sem internet
 */

import { useState } from 'react';
import { 
  Download, 
  Loader2, 
  WifiOff, 
  CheckCircle2, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { prefetchAnimesToCache } from '@/hooks/useAnimeWithFallback';
import { getCatalogCacheStats, cleanExpiredCatalogCache } from '@/lib/offlineCache';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Card de configurações para pré-carregamento offline
 */
export function OfflinePrefetchCard() {
  const { data: entries } = useAnimeEntries();
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [progress, setProgress] = useState({ cached: 0, fetched: 0, failed: 0, total: 0 });
  
  // Buscar estatísticas do cache
  const { data: cacheStats, refetch: refetchStats } = useQuery({
    queryKey: ['catalog-cache-stats'],
    queryFn: getCatalogCacheStats,
    staleTime: 60 * 1000, // 1 minuto
  });

  // Extrair mal_ids únicos da lista do usuário
  const malIds = (entries || []).map(e => e.mal_id).filter((id): id is number => typeof id === 'number');
  const uniqueMalIds = [...new Set(malIds)];

  /**
   * Inicia o pré-carregamento dos animes
   */
  const handlePrefetch = async () => {
    if (uniqueMalIds.length === 0) {
      toast.error('Sua lista está vazia');
      return;
    }

    setIsPrefetching(true);
    setProgress({ cached: 0, fetched: 0, failed: 0, total: uniqueMalIds.length });

    try {
      const result = await prefetchAnimesToCache(uniqueMalIds);
      setProgress({ ...result, total: uniqueMalIds.length });
      
      // Atualizar estatísticas
      await refetchStats();
      
      if (result.failed === 0) {
        toast.success(`${result.cached + result.fetched} animes disponíveis offline!`);
      } else {
        toast.warning(`${result.cached + result.fetched} animes salvos, ${result.failed} falhas`);
      }
    } catch (error) {
      console.error('[OfflinePrefetch] Erro:', error);
      toast.error('Erro ao pré-carregar animes');
    } finally {
      setIsPrefetching(false);
    }
  };

  /**
   * Limpa cache expirado
   */
  const handleCleanCache = async () => {
    try {
      const deleted = await cleanExpiredCatalogCache();
      await refetchStats();
      toast.success(`${deleted} entradas expiradas removidas`);
    } catch (error) {
      toast.error('Erro ao limpar cache');
    }
  };

  // Calcular progresso percentual
  const progressPercent = progress.total > 0 
    ? ((progress.cached + progress.fetched) / progress.total) * 100 
    : 0;

  // Formatar data do cache mais antigo
  const oldestCacheDate = cacheStats?.oldestEntry 
    ? new Date(cacheStats.oldestEntry).toLocaleDateString('pt-BR')
    : null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-muted-foreground" />
          Modo Offline
        </CardTitle>
        <CardDescription className="text-sm">
          Pré-carregue seus animes para acessar sem internet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas do cache */}
        {cacheStats && cacheStats.totalEntries > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <HardDrive className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {cacheStats.totalEntries} animes em cache
              </p>
              <p className="text-xs text-muted-foreground">
                {cacheStats.catalogCount} do catálogo • {cacheStats.jikanCount} do Jikan
                {oldestCacheDate && ` • Desde ${oldestCacheDate}`}
              </p>
            </div>
          </div>
        )}

        {/* Barra de progresso durante pré-carregamento */}
        {isPrefetching && (
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                {progress.cached} em cache
              </span>
              <span>
                <Download className="h-3 w-3 inline mr-1 text-blue-500" />
                {progress.fetched} baixados
              </span>
              {progress.failed > 0 && (
                <span>
                  <AlertCircle className="h-3 w-3 inline mr-1 text-destructive" />
                  {progress.failed} falhas
                </span>
              )}
            </div>
          </div>
        )}

        {/* Informação sobre a lista */}
        <p className="text-xs text-muted-foreground">
          {uniqueMalIds.length > 0 
            ? `Sua lista tem ${uniqueMalIds.length} animes únicos`
            : 'Adicione animes à sua lista para usar o modo offline'
          }
        </p>

        {/* Botões de ação */}
        <div className="flex gap-2">
          <Button
            onClick={handlePrefetch}
            disabled={isPrefetching || uniqueMalIds.length === 0}
            className="flex-1"
            size="sm"
          >
            {isPrefetching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Baixando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar para Offline
              </>
            )}
          </Button>
          
          {cacheStats && cacheStats.totalEntries > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanCache}
              disabled={isPrefetching}
            >
              Limpar expirados
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
