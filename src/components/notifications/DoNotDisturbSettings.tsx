import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Moon, Clock } from 'lucide-react';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { isInDoNotDisturbPeriod } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

/**
 * Componente para configurar o modo "não perturbe"
 * Permite definir horários onde as notificações são silenciadas
 */
export function DoNotDisturbSettings() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  // Handler para atualizar preferências
  const handleUpdate = async (field: string, value: boolean | string) => {
    try {
      await updatePreferences.mutateAsync({ [field]: value });
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  // Valores atuais ou padrão
  const isEnabled = preferences?.do_not_disturb_enabled ?? false;
  const startTime = preferences?.do_not_disturb_start ?? '22:00';
  const endTime = preferences?.do_not_disturb_end ?? '08:00';
  
  // Verifica se está ativo agora
  const isActiveNow = isInDoNotDisturbPeriod(isEnabled, startTime, endTime);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5 text-primary" />
            Modo Não Perturbe
          </CardTitle>
          {isActiveNow && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              Ativo agora
            </Badge>
          )}
        </div>
        <CardDescription>
          Silencie notificações durante horários específicos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle principal */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Ativar modo não perturbe</Label>
            <p className="text-sm text-muted-foreground">
              Notificações serão silenciadas no horário definido
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => handleUpdate('do_not_disturb_enabled', checked)}
            disabled={updatePreferences.isPending}
          />
        </div>

        {/* Configuração de horários */}
        {isEnabled && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Definir horários</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Início</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime.slice(0, 5)}
                  onChange={(e) => handleUpdate('do_not_disturb_start', e.target.value + ':00')}
                  disabled={updatePreferences.isPending}
                  className="bg-background/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-time">Fim</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime.slice(0, 5)}
                  onChange={(e) => handleUpdate('do_not_disturb_end', e.target.value + ':00')}
                  disabled={updatePreferences.isPending}
                  className="bg-background/50"
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Notificações serão silenciadas das {startTime.slice(0, 5)} às {endTime.slice(0, 5)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
