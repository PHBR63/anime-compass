import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Volume2, VolumeX, MessageSquare, Users, Star } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface NotificationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Configurações de notificação armazenadas no localStorage
const NOTIFICATION_SETTINGS_KEY = 'chat_notification_settings';

interface NotificationSettings {
  soundEnabled: boolean;
  pushEnabled: boolean;
  directMessages: boolean;
  groupMessages: boolean;
  recommendations: boolean;
}

const defaultSettings: NotificationSettings = {
  soundEnabled: true,
  pushEnabled: false,
  directMessages: true,
  groupMessages: true,
  recommendations: true,
};

// Função para buscar configurações
export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Erro ao ler configurações de notificação:', e);
  }
  return defaultSettings;
}

// Função para salvar configurações
function saveNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Erro ao salvar configurações de notificação:', e);
  }
}

// Modal de configurações de notificações do chat
export default function NotificationSettingsModal({
  open,
  onOpenChange,
}: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const { isSupported, permission, requestPermission } = usePushNotifications();

  // Atualizar uma configuração
  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  // Solicitar permissão para notificações push
  const handleEnablePush = async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return;
    }

    if (permission === 'denied') {
      toast.error('Notificações foram bloqueadas. Habilite nas configurações do navegador.');
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      updateSetting('pushEnabled', true);
      toast.success('Notificações push ativadas!');
    } else {
      toast.error('Permissão de notificações negada');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificações
          </DialogTitle>
          <DialogDescription>
            Personalize como você recebe notificações do chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Som de notificação */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="sound" className="text-base">Som de notificação</Label>
                <p className="text-xs text-muted-foreground">
                  Tocar som ao receber mensagens
                </p>
              </div>
            </div>
            <Switch
              id="sound"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
            />
          </div>

          {/* Notificações push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.pushEnabled && permission === 'granted' ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="push" className="text-base">Notificações push</Label>
                <p className="text-xs text-muted-foreground">
                  {permission === 'denied' 
                    ? 'Bloqueadas pelo navegador'
                    : 'Receber notificações mesmo minimizado'
                  }
                </p>
              </div>
            </div>
            {permission === 'granted' ? (
              <Switch
                id="push"
                checked={settings.pushEnabled}
                onCheckedChange={(checked) => updateSetting('pushEnabled', checked)}
              />
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleEnablePush}
                disabled={permission === 'denied'}
              >
                Ativar
              </Button>
            )}
          </div>

          <Separator />

          {/* Filtros de tipo */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Notificar para:</p>

            {/* Mensagens diretas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="direct" className="text-sm font-normal">
                  Mensagens diretas
                </Label>
              </div>
              <Switch
                id="direct"
                checked={settings.directMessages}
                onCheckedChange={(checked) => updateSetting('directMessages', checked)}
              />
            </div>

            {/* Mensagens de grupos */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="group" className="text-sm font-normal">
                  Mensagens de grupos
                </Label>
              </div>
              <Switch
                id="group"
                checked={settings.groupMessages}
                onCheckedChange={(checked) => updateSetting('groupMessages', checked)}
              />
            </div>

            {/* Indicações */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="recommendations" className="text-sm font-normal">
                  Indicações de anime
                </Label>
              </div>
              <Switch
                id="recommendations"
                checked={settings.recommendations}
                onCheckedChange={(checked) => updateSetting('recommendations', checked)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
