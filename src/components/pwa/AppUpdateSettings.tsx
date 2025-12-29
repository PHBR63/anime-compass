import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, AlertCircle, Smartphone, Zap, Bell,
  HardDrive, Trash2, Database, Shield, Cloud, CloudOff, Bug
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { APP_VERSION, VERSION_NAME, getBuildDateFormatted } from '@/lib/version';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Formata bytes para exibição legível
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Interface para estatísticas de cache
 */
interface CacheStats {
  name: string;
  entries: number;
  size: number;
}

/**
 * Componente expandido para configurações do sistema e PWA
 * Inclui informações de cache, sync e debug
 */
export function AppUpdateSettings() {
  const { 
    needRefresh, 
    isChecking, 
    checkForUpdate, 
    applyUpdate,
    offlineReady 
  } = usePWAUpdate();
  
  const { isInstalled, deviceType } = usePWAInstall();
  const { isEnabled: autoUpdateEnabled, toggle: toggleAutoUpdate } = useAutoUpdate();
  const { pendingCount, isSyncing, lastSyncTime, syncAll, isOnline } = useOfflineSync();
  const { isSupported: bgSyncSupported, periodicSyncSupported } = useBackgroundSync();

  const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [debugMode, setDebugMode] = useState(() => 
    localStorage.getItem('pwa-debug-mode') === 'true'
  );

  /**
   * Carrega estatísticas dos caches do Workbox
   */
  const loadCacheStats = useCallback(async () => {
    setIsLoadingCache(true);
    try {
      const cacheNames = await caches.keys();
      const stats: CacheStats[] = [];
      let total = 0;

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        let size = 0;

        // Estimar tamanho baseado no número de entries
        // Nota: não é possível obter tamanho real dos caches
        size = keys.length * 50 * 1024; // Estimativa de 50KB por entrada

        stats.push({
          name: name.replace('workbox-', '').replace('-cache', ''),
          entries: keys.length,
          size,
        });
        total += size;
      }

      setCacheStats(stats);
      setTotalCacheSize(total);
    } catch (error) {
      console.warn('[AppUpdateSettings] Erro ao carregar cache stats:', error);
    } finally {
      setIsLoadingCache(false);
    }
  }, []);

  // Carregar stats ao montar
  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

  /**
   * Handler para verificar atualizações
   */
  const handleCheckUpdate = async () => {
    await checkForUpdate();
  };

  /**
   * Handler para aplicar atualização
   */
  const handleApplyUpdate = async () => {
    await applyUpdate(true);
  };

  /**
   * Handler para limpar todos os caches
   */
  const handleClearAllCaches = async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await loadCacheStats();
      toast.success('Todos os caches foram limpos');
    } catch (error) {
      toast.error('Erro ao limpar caches');
    }
  };

  /**
   * Handler para forçar sincronização
   */
  const handleForceSync = async () => {
    await syncAll();
    toast.success('Sincronização iniciada');
  };

  /**
   * Toggle do modo debug
   */
  const handleToggleDebug = () => {
    const newValue = !debugMode;
    setDebugMode(newValue);
    localStorage.setItem('pwa-debug-mode', String(newValue));
    toast.success(newValue ? 'Modo debug ativado' : 'Modo debug desativado');
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-sakura" />
          Sistema e PWA
        </CardTitle>
        <CardDescription className="text-sm">
          Informações, atualizações e cache do aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Versão e build */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Versão</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted inline-block w-fit">
              v{APP_VERSION} ({VERSION_NAME})
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Última atualização</span>
            <span className="text-xs">{getBuildDateFormatted()}</span>
          </div>
        </div>

        {/* Status de instalação e offline */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Modo</span>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              isInstalled 
                ? "bg-green-500/10 text-green-500" 
                : "bg-muted text-muted-foreground"
            )}>
              {isInstalled ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {isInstalled ? 'PWA' : deviceType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Offline</span>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              offlineReady 
                ? "bg-green-500/10 text-green-500" 
                : "bg-amber-500/10 text-amber-500"
            )}>
              {offlineReady ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {offlineReady ? 'Pronto' : 'Carregando'}
            </span>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Status de sincronização */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              {isOnline ? <Cloud className="h-3.5 w-3.5 text-green-500" /> : <CloudOff className="h-3.5 w-3.5 text-amber-500" />}
              Conexão
            </span>
            <span className={cn(
              "text-xs font-medium",
              isOnline ? "text-green-500" : "text-amber-500"
            )}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Operações pendentes</span>
              <span className="text-xs font-medium text-amber-500">{pendingCount}</span>
            </div>
          )}

          {lastSyncTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Última sincronização</span>
              <span className="text-xs text-muted-foreground">
                {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleForceSync}
            disabled={isSyncing || !isOnline}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
          </Button>
        </div>

        <Separator className="my-3" />

        {/* Recursos do SW */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Recursos do Service Worker</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Shield className={cn("h-3 w-3", bgSyncSupported ? "text-green-500" : "text-muted-foreground")} />
              <span className={bgSyncSupported ? "text-foreground" : "text-muted-foreground"}>
                Background Sync
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw className={cn("h-3 w-3", periodicSyncSupported ? "text-green-500" : "text-muted-foreground")} />
              <span className={periodicSyncSupported ? "text-foreground" : "text-muted-foreground"}>
                Periodic Sync
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Toggle de auto-update */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {autoUpdateEnabled ? (
              <Zap className="h-4 w-4 text-sakura" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="space-y-0.5">
              <Label htmlFor="auto-update" className="text-sm font-medium cursor-pointer">
                Atualização automática
              </Label>
              <p className="text-xs text-muted-foreground">
                {autoUpdateEnabled ? 'Atualiza silenciosamente' : 'Pergunta antes'}
              </p>
            </div>
          </div>
          <Switch
            id="auto-update"
            checked={autoUpdateEnabled}
            onCheckedChange={toggleAutoUpdate}
          />
        </div>

        {/* Verificar atualizações */}
        <div className="space-y-3">
          {needRefresh ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Nova versão disponível!
              </p>
              <Button onClick={handleApplyUpdate} className="w-full" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar agora
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleCheckUpdate} 
              disabled={isChecking}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isChecking && "animate-spin")} />
              {isChecking ? 'Verificando...' : 'Verificar atualizações'}
            </Button>
          )}
        </div>

        <Separator className="my-3" />

        {/* Estatísticas de cache */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Cache do Aplicativo
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={loadCacheStats}
              disabled={isLoadingCache}
            >
              <RefreshCw className={cn("h-3 w-3", isLoadingCache && "animate-spin")} />
            </Button>
          </div>

          {cacheStats.length > 0 && (
            <div className="space-y-1.5">
              {cacheStats.slice(0, 4).map((cache) => (
                <div key={cache.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[120px]">{cache.name}</span>
                  <span className="font-mono">{cache.entries} itens</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs font-medium pt-1 border-t border-border/50">
                <span>Total estimado</span>
                <span className="font-mono">{formatBytes(totalCacheSize)}</span>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleClearAllCaches}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar todos os caches
          </Button>
        </div>

        <Separator className="my-3" />

        {/* Modo debug */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className={cn("h-4 w-4", debugMode ? "text-amber-500" : "text-muted-foreground")} />
            <div className="space-y-0.5">
              <Label htmlFor="debug-mode" className="text-sm font-medium cursor-pointer">
                Modo Debug
              </Label>
              <p className="text-xs text-muted-foreground">
                Exibe logs detalhados no console
              </p>
            </div>
          </div>
          <Switch
            id="debug-mode"
            checked={debugMode}
            onCheckedChange={handleToggleDebug}
          />
        </div>
      </CardContent>
    </Card>
  );
}
