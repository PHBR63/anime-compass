import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Palette, 
  Shield, 
  User, 
  Smartphone,
  ChevronRight,
  ArrowLeft,
  Download,
  Loader2,
  FileJson,
  FileSpreadsheet,
  Table
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AppUpdateSettings } from '@/components/pwa/AppUpdateSettings';
import { ImageCacheSettings } from '@/components/pwa/ImageCacheSettings';
import { NotificationPreferencesCard } from '@/components/notifications/NotificationPreferencesCard';
import { PushCategoriesCard } from '@/components/notifications/PushCategoriesCard';
import { DoNotDisturbSettings } from '@/components/notifications/DoNotDisturbSettings';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useAnimationPreferences } from '@/hooks/useAnimationPreferences';
import { useExportUserData } from '@/hooks/useExportUserData';
import { cn } from '@/lib/utils';

type SettingsSection = 'main' | 'notifications' | 'appearance' | 'system';

/**
 * Página de Configurações
 * Permite ao usuário gerenciar preferências de notificações, tema e sistema
 */
export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { preferences, togglePreference } = useAnimationPreferences();
  const { isExporting, exportAsJson, exportAsCsv, exportAsExcel } = useExportUserData();

  /**
   * Renderiza o menu principal de configurações
   */
  const renderMainMenu = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3"
    >
      {/* Seção: Notificações */}
      <button
        onClick={() => setActiveSection('notifications')}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sakura/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-sakura" />
          </div>
          <div className="text-left">
            <p className="font-medium">Notificações</p>
            <p className="text-sm text-muted-foreground">
              Gerencie alertas e preferências
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Seção: Aparência */}
      <button
        onClick={() => setActiveSection('appearance')}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-accent" />
          </div>
          <div className="text-left">
            <p className="font-medium">Aparência</p>
            <p className="text-sm text-muted-foreground">
              Tema e personalização visual
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Seção: Sistema */}
      <button
        onClick={() => setActiveSection('system')}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-torii/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-torii" />
          </div>
          <div className="text-left">
            <p className="font-medium">Sistema</p>
            <p className="text-sm text-muted-foreground">
              Atualizações e informações do app
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Link para perfil */}
      <Separator className="my-4" />
      
      <button
        onClick={() => navigate('/profile')}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium">Meu Perfil</p>
            <p className="text-sm text-muted-foreground">
              Editar informações pessoais
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
    </motion.div>
  );

  /**
   * Renderiza a seção de notificações
   */
  const renderNotificationsSection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <NotificationPreferencesCard />
      <PushCategoriesCard />
      <DoNotDisturbSettings />
    </motion.div>
  );

  /**
   * Renderiza a seção de aparência
   */
  const renderAppearanceSection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" />
            Tema
          </CardTitle>
          <CardDescription className="text-sm">
            Escolha entre tema claro ou escuro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Modo escuro</Label>
              <p className="text-xs text-muted-foreground">
                Alterne entre claro e escuro
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Animações</CardTitle>
          <CardDescription className="text-sm">
            Controle os efeitos visuais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Transições de página</Label>
              <p className="text-xs text-muted-foreground">
                Pétalas de sakura entre páginas
              </p>
            </div>
            <Switch 
              checked={preferences.pageTransitions}
              onCheckedChange={() => togglePreference('pageTransitions')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Reduzir movimento</Label>
              <p className="text-xs text-muted-foreground">
                Desabilita todas as animações
              </p>
            </div>
            <Switch 
              checked={preferences.reducedMotion}
              onCheckedChange={() => togglePreference('reducedMotion')}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  /**
   * Renderiza a seção de sistema
   */
  const renderSystemSection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <AppUpdateSettings />
      <ImageCacheSettings />

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Dados e Privacidade
          </CardTitle>
          <CardDescription className="text-sm">
            Gerencie seus dados pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground mb-2">
            Exporte seus dados em diferentes formatos
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              className="justify-start" 
              size="sm"
              onClick={exportAsExcel}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Table className="h-4 w-4 mr-2 text-emerald-600" />
              )}
              Excel
            </Button>
            <Button 
              variant="outline" 
              className="justify-start" 
              size="sm"
              onClick={exportAsJson}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4 mr-2 text-blue-500" />
              )}
              JSON
            </Button>
            <Button 
              variant="outline" 
              className="justify-start" 
              size="sm"
              onClick={exportAsCsv}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
              )}
              CSV
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Excel: arquivo único com abas • JSON: dados completos • CSV: arquivos separados
          </p>
          <Button 
            variant="outline" 
            className="w-full justify-start text-destructive hover:text-destructive" 
            size="sm"
          >
            Excluir conta
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  /**
   * Obtém o título da seção atual
   */
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'notifications':
        return 'Notificações';
      case 'appearance':
        return 'Aparência';
      case 'system':
        return 'Sistema';
      default:
        return 'Configurações';
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {activeSection !== 'main' ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveSection('main')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sakura/20 to-accent/20 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-sakura" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{getSectionTitle()}</h1>
          {activeSection === 'main' && (
            <p className="text-sm text-muted-foreground">
              Gerencie suas preferências
            </p>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl">
        {activeSection === 'main' && renderMainMenu()}
        {activeSection === 'notifications' && renderNotificationsSection()}
        {activeSection === 'appearance' && renderAppearanceSection()}
        {activeSection === 'system' && renderSystemSection()}
      </div>
    </div>
  );
}
