import { RefreshCw, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

/**
 * Componente para exibir informações do sistema e permitir verificar atualizações manualmente
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

  /**
   * Handler para verificar atualizações manualmente
   */
  const handleCheckUpdate = async () => {
    await checkForUpdate();
  };

  /**
   * Handler para aplicar atualização disponível
   */
  const handleApplyUpdate = async () => {
    await applyUpdate(true);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-sakura" />
          Sistema
        </CardTitle>
        <CardDescription className="text-sm">
          Informações e atualizações do aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status de instalação */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Modo de execução</span>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
            isInstalled 
              ? "bg-green-500/10 text-green-500" 
              : "bg-muted text-muted-foreground"
          )}>
            {isInstalled ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                App Instalado
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Navegador ({deviceType})
              </>
            )}
          </span>
        </div>

        {/* Status offline */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Suporte offline</span>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
            offlineReady 
              ? "bg-green-500/10 text-green-500" 
              : "bg-amber-500/10 text-amber-500"
          )}>
            {offlineReady ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Disponível
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Carregando...
              </>
            )}
          </span>
        </div>

        {/* Verificar atualizações */}
        <div className="pt-2 border-t border-border/50 space-y-3">
          {needRefresh ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Nova versão disponível!
              </p>
              <Button 
                onClick={handleApplyUpdate} 
                className="w-full"
                variant="default"
              >
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
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                isChecking && "animate-spin"
              )} />
              {isChecking ? 'Verificando...' : 'Verificar atualizações'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
