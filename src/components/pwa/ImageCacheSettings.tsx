import { useState, useEffect } from 'react';
import { HardDrive, Trash2, RefreshCw, Image, Loader2, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { getImageCacheStats, clearImageCache } from '@/lib/imageCache';
import { useNetworkType, isGoodConnectionForPrefetch } from '@/hooks/useNetworkType';
import { cn } from '@/lib/utils';

/**
 * Interface para estatísticas do cache de imagens
 */
interface CacheStats {
  count: number;
  totalSize: number;
  oldestDate: Date | null;
}

/**
 * Formata bytes para exibição legível (KB, MB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formata data relativa para exibição
 */
function formatRelativeDate(date: Date | null): string {
  if (!date) return 'N/A';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return `${Math.floor(diffDays / 30)} meses atrás`;
}

// Limite máximo de imagens no cache
const MAX_CACHED_IMAGES = 500;

/**
 * Componente para gerenciamento do cache de imagens
 * Exibe estatísticas e permite limpar o cache
 */
export function ImageCacheSettings() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const networkInfo = useNetworkType();
  const isPrefetchEnabled = isGoodConnectionForPrefetch(networkInfo);

  /**
   * Carrega estatísticas do cache
   */
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const cacheStats = await getImageCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.warn('[ImageCacheSettings] Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Limpa o cache de imagens
   */
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearImageCache();
      setStats({ count: 0, totalSize: 0, oldestDate: null });
      toast({
        title: 'Cache limpo',
        description: 'Todas as imagens em cache foram removidas.',
      });
    } catch (error) {
      console.warn('[ImageCacheSettings] Erro ao limpar cache:', error);
      toast({
        title: 'Erro ao limpar cache',
        description: 'Não foi possível limpar o cache de imagens.',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Carrega estatísticas ao montar o componente
  useEffect(() => {
    loadStats();
  }, []);

  // Calcula a porcentagem de uso do cache
  const usagePercentage = stats ? (stats.count / MAX_CACHED_IMAGES) * 100 : 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Image className="h-4 w-4 text-sakura" />
          Cache de Imagens
        </CardTitle>
        <CardDescription className="text-sm">
          Imagens armazenadas para acesso offline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="space-y-3">
              {/* Barra de uso */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uso do cache</span>
                  <span className="font-medium">
                    {stats?.count || 0} / {MAX_CACHED_IMAGES} imagens
                  </span>
                </div>
                <Progress 
                  value={usagePercentage} 
                  className="h-2"
                />
              </div>

              {/* Tamanho total */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5" />
                  Tamanho total
                </span>
                <span className={cn(
                  "font-medium",
                  stats && stats.totalSize > 0 ? "text-foreground" : "text-muted-foreground"
                )}>
                  {stats ? formatBytes(stats.totalSize) : '0 B'}
                </span>
              </div>

              {/* Data mais antiga */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Imagem mais antiga</span>
                <span className="text-muted-foreground text-xs">
                  {stats?.oldestDate ? formatRelativeDate(stats.oldestDate) : 'Nenhuma'}
                </span>
              </div>

              {/* Status de pré-carregamento automático */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pré-carregamento</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                  isPrefetchEnabled 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {isPrefetchEnabled ? (
                    <>
                      <Wifi className="h-3 w-3" />
                      Ativo (WiFi)
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3" />
                      Pausado
                    </>
                  )}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                  stats && stats.count > 0 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {stats && stats.count > 0 ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Ativo
                    </>
                  ) : (
                    'Vazio'
                  )}
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={loadStats}
                disabled={isLoading}
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  isLoading && "animate-spin"
                )} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive hover:text-destructive"
                onClick={handleClearCache}
                disabled={isClearing || !stats?.count}
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Limpar Cache
              </Button>
            </div>

            {/* Nota explicativa */}
            <p className="text-xs text-muted-foreground">
              Imagens são pré-carregadas automaticamente quando em WiFi. 
              O cache limpa itens antigos após 30 dias.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
