import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Share, 
  Plus, 
  CheckCircle2, 
  Smartphone, 
  Wifi, 
  Bell, 
  Zap,
  ArrowLeft,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { motion } from 'framer-motion';

/**
 * Página de instalação do PWA
 * Mostra instruções detalhadas e benefícios de instalar o app
 */
export default function Install() {
  const navigate = useNavigate();
  const { isInstalled, canInstall, deviceType, install } = usePWAInstall();

  // Redirecionar se já está instalado
  useEffect(() => {
    if (isInstalled) {
      navigate('/dashboard');
    }
  }, [isInstalled, navigate]);

  // Função para instalar
  const handleInstall = async () => {
    const success = await install();
    if (success) {
      navigate('/dashboard');
    }
  };

  // Benefícios de instalar
  const benefits = [
    {
      icon: Zap,
      title: 'Acesso Rápido',
      description: 'Abra o AniCheck diretamente da sua tela inicial'
    },
    {
      icon: Wifi,
      title: 'Funciona Offline',
      description: 'Acesse sua lista mesmo sem conexão com a internet'
    },
    {
      icon: Bell,
      title: 'Notificações',
      description: 'Receba alertas sobre novos episódios e recomendações'
    },
    {
      icon: Smartphone,
      title: 'Experiência Nativa',
      description: 'Interface otimizada para seu dispositivo'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Instalar AniCheck</h1>
            <p className="text-muted-foreground">
              Tenha a melhor experiência anime no seu dispositivo
            </p>
          </div>
        </div>

        {/* Preview do App */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                <Smartphone className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">AniCheck</h2>
              <p className="text-muted-foreground text-sm">
                Organize sua jornada anime
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Benefícios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="p-4">
                <benefit.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium text-sm mb-1">{benefit.title}</h3>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Instruções de instalação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {deviceType === 'ios' ? (
            // Instruções para iOS
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Como instalar no iPhone/iPad
                </h3>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                      1
                    </span>
                    <div>
                      <p className="font-medium">Toque no ícone de compartilhar</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Share className="h-4 w-4" /> Na barra inferior do Safari
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                      2
                    </span>
                    <div>
                      <p className="font-medium">Role e toque em "Adicionar à Tela de Início"</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Plus className="h-4 w-4" /> No menu de opções
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                      3
                    </span>
                    <div>
                      <p className="font-medium">Confirme tocando em "Adicionar"</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-4 w-4" /> Pronto! O app estará na sua tela inicial
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          ) : canInstall ? (
            // Botão de instalação para Android/Desktop
            <Card className="border-primary/20">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-4">
                  Instalação disponível!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Clique no botão abaixo para adicionar o AniCheck à sua tela inicial
                </p>
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="gap-2 w-full md:w-auto"
                >
                  <Download className="h-5 w-5" />
                  Instalar AniCheck
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Instruções genéricas
            <Card className="border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Como instalar
                </h3>
                <p className="text-muted-foreground mb-4">
                  Acesse o AniCheck pelo Chrome ou Edge para ver a opção de instalação,
                  ou procure pelo ícone de instalação na barra de endereço do seu navegador.
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Download className="h-4 w-4" />
                  <span>Procure pelo ícone de download na barra de endereço</span>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Link para continuar no navegador */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground"
          >
            Continuar no navegador
          </Button>
        </div>
      </div>
    </div>
  );
}
