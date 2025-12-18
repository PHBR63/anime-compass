import { Bell, BellOff, BellRing, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente de configuração de push notifications
 * Permite ao usuário habilitar/desabilitar notificações do navegador
 */
export function PushNotificationSettings() {
  const { isSupported, permission, isEnabled, requestPermission } = usePushNotifications();
  const { toast } = useToast();

  // Solicitar permissão de notificações
  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    
    if (granted) {
      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá alertas mesmo com a aba minimizada.',
      });
    } else {
      toast({
        title: 'Permissão negada',
        description: 'Você pode ativar nas configurações do navegador.',
        variant: 'destructive',
      });
    }
  };

  // Se não suporta notificações
  if (!isSupported) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receba alertas mesmo quando a aba estiver minimizada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEnabled ? (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span>Notificações ativadas</span>
            </div>
            <span className="text-muted-foreground text-xs">
              Você receberá alertas de amizades, conquistas e mais.
            </span>
          </div>
        ) : permission === 'denied' ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Notificações bloqueadas. Para ativar, clique no ícone de cadeado 
              na barra de endereço do navegador.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ative para receber alertas de:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Solicitações de amizade</li>
              <li>Likes em suas reviews</li>
              <li>Novas conquistas</li>
              <li>Atualizações de amigos</li>
            </ul>
            <Button 
              onClick={handleRequestPermission}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <BellRing className="h-4 w-4" />
              Ativar Notificações
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
