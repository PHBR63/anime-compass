import { Bell, BellRing, Users, Heart, Trophy, MessageSquare, Sparkles, UserPlus, CheckCircle2, BellOff, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Interface para configuração de push notification por categoria
 */
interface PushCategory {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  preferenceKey: string;
}

/**
 * Card de configuração de categorias de push notifications
 * Permite ao usuário escolher quais tipos de notificações push deseja receber
 */
export function PushCategoriesCard() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { isSupported, isEnabled, permission, requestPermission } = usePushNotifications();
  const { toast } = useToast();

  // Solicitar permissão de push
  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    
    if (granted) {
      toast({
        title: 'Notificações push ativadas!',
        description: 'Configure abaixo quais tipos deseja receber.',
      });
    } else {
      toast({
        title: 'Permissão negada',
        description: 'Você pode ativar nas configurações do navegador.',
        variant: 'destructive',
      });
    }
  };

  // Atualiza uma preferência específica
  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast({
        title: 'Preferência atualizada',
        description: value ? 'Push ativado para esta categoria' : 'Push desativado para esta categoria',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  // Categorias de push notification
  const pushCategories: PushCategory[] = [
    {
      key: 'push_friend_requests',
      label: 'Solicitações de amizade',
      description: 'Receba push quando alguém enviar uma solicitação',
      icon: UserPlus,
      preferenceKey: 'friend_requests',
    },
    {
      key: 'push_friend_accepted',
      label: 'Amizade aceita',
      description: 'Receba push quando aceitarem sua solicitação',
      icon: Users,
      preferenceKey: 'friend_accepted',
    },
    {
      key: 'push_friend_activity',
      label: 'Atividade de amigos',
      description: 'Push quando amigos adicionam ou assistem animes',
      icon: Sparkles,
      preferenceKey: 'friend_added_anime',
    },
    {
      key: 'push_review_likes',
      label: 'Likes em reviews',
      description: 'Push quando alguém curtir sua review',
      icon: Heart,
      preferenceKey: 'review_likes',
    },
    {
      key: 'push_achievements',
      label: 'Conquistas',
      description: 'Push quando desbloquear uma nova conquista',
      icon: Trophy,
      preferenceKey: 'achievements',
    },
    {
      key: 'push_recommendations',
      label: 'Recomendações',
      description: 'Push quando um amigo recomendar um anime',
      icon: MessageSquare,
      preferenceKey: 'recommendations',
    },
  ];

  // Se não suporta push
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

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Se push não está habilitado
  if (!isEnabled) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Push Notifications
            </CardTitle>
            {permission === 'denied' && (
              <Badge variant="destructive" className="text-xs">
                Bloqueado
              </Badge>
            )}
          </div>
          <CardDescription>
            {permission === 'denied' 
              ? 'Notificações bloqueadas no navegador. Clique no ícone de cadeado na barra de endereço para permitir.'
              : 'Ative para receber alertas mesmo com a aba minimizada ou fechada.'
            }
          </CardDescription>
        </CardHeader>
        {permission !== 'denied' && (
          <CardContent>
            <div className="space-y-4">
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Solicitações de amizade</li>
                <li>Likes em suas reviews</li>
                <li>Novas conquistas</li>
                <li>Recomendações de amigos</li>
              </ul>
              <Button 
                onClick={handleRequestPermission}
                variant="outline"
                size="sm"
                className="gap-2 w-full"
              >
                <BellRing className="h-4 w-4" />
                Ativar Push Notifications
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Push Notifications
          </CardTitle>
          <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ativo
          </Badge>
        </div>
        <CardDescription>
          Configure quais categorias enviam push mesmo com app em background
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pushCategories.map((category, index) => {
          // Verifica se a preferência base está ativa
          const basePreference = preferences?.[category.preferenceKey as keyof typeof preferences];
          const isPreferenceEnabled = basePreference !== false;
          
          return (
            <div key={category.key}>
              {index > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <category.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <Label 
                      htmlFor={category.key} 
                      className="text-sm font-medium cursor-pointer block truncate"
                    >
                      {category.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={category.key}
                  checked={isPreferenceEnabled}
                  onCheckedChange={(checked) => handleToggle(category.preferenceKey, checked)}
                  disabled={updatePreferences.isPending}
                />
              </div>
            </div>
          );
        })}
        
        <Separator className="my-4" />
        
        <p className="text-xs text-muted-foreground text-center">
          Notificações push respeitam o modo "Não Perturbe" quando ativado.
        </p>
      </CardContent>
    </Card>
  );
}
