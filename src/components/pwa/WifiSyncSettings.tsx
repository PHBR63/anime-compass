/**
 * Componente de configurações para sincronização automática via WiFi
 */

import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWifiAnimeSync } from '@/hooks/useWifiAnimeSync';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Card de configurações para sincronização automática em WiFi
 */
export function WifiSyncSettings() {
  const { 
    stats, 
    networkInfo, 
    isWifi, 
    isSyncing, 
    toggleEnabled, 
    forceSync 
  } = useWifiAnimeSync();

  // Formatar última sincronização
  const lastSyncText = stats.lastSync 
    ? formatDistanceToNow(stats.lastSync, { addSuffix: true, locale: ptBR })
    : 'Nunca';

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {isWifi ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          Sincronização Automática
        </CardTitle>
        <CardDescription className="text-sm">
          Sincroniza dados automaticamente quando em WiFi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status da conexão */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Conexão:</span>
          <Badge variant={networkInfo.isOnline ? 'secondary' : 'destructive'}>
            {networkInfo.type === 'wifi' && 'WiFi'}
            {networkInfo.type === 'cellular' && 'Dados móveis'}
            {networkInfo.type === 'ethernet' && 'Ethernet'}
            {networkInfo.type === 'unknown' && 'Desconhecida'}
            {networkInfo.type === 'offline' && 'Offline'}
          </Badge>
          {networkInfo.saveData && (
            <Badge variant="outline" className="text-xs">
              Economia de dados
            </Badge>
          )}
        </div>

        {/* Toggle de ativação */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Sincronização automática</Label>
            <p className="text-xs text-muted-foreground">
              Baixa dados quando em WiFi ou Ethernet
            </p>
          </div>
          <Switch 
            checked={stats.isEnabled}
            onCheckedChange={toggleEnabled}
          />
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Última sync</p>
              <p className="text-sm font-medium truncate">{lastSyncText}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Em cache</p>
              <p className="text-sm font-medium">{stats.animesInCache} animes</p>
            </div>
          </div>
        </div>

        {/* Último resultado */}
        {stats.lastResult && (
          <p className="text-xs text-muted-foreground">
            Última sincronização: {stats.lastResult.cached} em cache, 
            {stats.lastResult.fetched} baixados
            {stats.lastResult.failed > 0 && `, ${stats.lastResult.failed} falhas`}
          </p>
        )}

        {/* Botão de sincronização manual */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={forceSync}
          disabled={isSyncing || !networkInfo.isOnline}
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar agora
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
