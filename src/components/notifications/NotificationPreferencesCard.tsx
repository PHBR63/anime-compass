import { Bell, Users, Heart, Trophy, MessageSquare, Sparkles, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Card de configurações de preferências de notificação
 * Permite ao usuário escolher quais tipos de notificações deseja receber
 */
export function NotificationPreferencesCard() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { toast } = useToast();

  // Atualiza uma preferência específica
  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast({
        title: 'Preferências atualizadas',
        description: value ? 'Notificação ativada' : 'Notificação desativada',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const notificationSettings = [
    {
      key: 'friend_added_anime',
      label: 'Amigo adicionou anime',
      description: 'Quando um amigo adiciona um novo anime à lista',
      icon: Users,
      value: preferences?.friend_added_anime ?? true,
    },
    {
      key: 'friend_started_watching',
      label: 'Amigo começou a assistir',
      description: 'Quando um amigo começa a assistir um anime',
      icon: Sparkles,
      value: preferences?.friend_started_watching ?? true,
    },
    {
      key: 'friend_requests',
      label: 'Solicitações de amizade',
      description: 'Quando alguém envia uma solicitação de amizade',
      icon: UserPlus,
      value: preferences?.friend_requests ?? true,
    },
    {
      key: 'friend_accepted',
      label: 'Amizade aceita',
      description: 'Quando sua solicitação de amizade é aceita',
      icon: Users,
      value: preferences?.friend_accepted ?? true,
    },
    {
      key: 'review_likes',
      label: 'Likes em reviews',
      description: 'Quando alguém curte sua review',
      icon: Heart,
      value: preferences?.review_likes ?? true,
    },
    {
      key: 'achievements',
      label: 'Conquistas',
      description: 'Quando você desbloqueia uma nova conquista',
      icon: Trophy,
      value: preferences?.achievements ?? true,
    },
    {
      key: 'recommendations',
      label: 'Recomendações',
      description: 'Quando um amigo recomenda um anime para você',
      icon: MessageSquare,
      value: preferences?.recommendations ?? true,
    },
  ];

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>
          Escolha quais atividades você deseja ser notificado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationSettings.map((setting, index) => (
          <div key={setting.key}>
            {index > 0 && <Separator className="mb-4" />}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <setting.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-0.5">
                  <Label 
                    htmlFor={setting.key} 
                    className="text-sm font-medium cursor-pointer"
                  >
                    {setting.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                id={setting.key}
                checked={setting.value}
                onCheckedChange={(checked) => handleToggle(setting.key, checked)}
                disabled={updatePreferences.isPending}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
