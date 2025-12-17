import { Wrench, Clock, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Página de manutenção
 * Exibida quando o sistema está em manutenção programada
 */
const Maintenance = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      
      {/* Engrenagens animadas de fundo */}
      <div className="absolute top-20 left-20 opacity-10">
        <Wrench className="w-32 h-32 text-amber-500 animate-spin" style={{ animationDuration: '10s' }} />
      </div>
      <div className="absolute bottom-20 right-20 opacity-10">
        <Wrench className="w-24 h-24 text-orange-500 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
      </div>
      
      {/* Conteúdo principal */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Ícone principal */}
        <div className="relative mb-8 flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center animate-float">
              <Wrench className="w-16 h-16 md:w-20 md:h-20 text-amber-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center animate-bounce">
              <Clock className="w-4 h-4 text-background" />
            </div>
          </div>
        </div>

        {/* Mensagem de manutenção */}
        <div className="glass-card p-8 rounded-2xl mb-8 animate-fade-in border border-amber-500/20">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Em Manutenção
          </h1>
          <h2 className="text-xl md:text-2xl text-amber-500 font-semibold mb-4">
            Voltamos em breve!
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Estamos trabalhando para melhorar sua experiência. 
            O sistema estará disponível em alguns minutos.
          </p>
          
          {/* Barra de progresso simulada */}
          <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
          <p className="text-muted-foreground/70 text-sm">
            Progresso estimado: 60%
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button
            size="lg"
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-background"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-5 h-5" />
            Tentar Novamente
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="gap-2 border-amber-500/50 hover:bg-amber-500/10"
            asChild
          >
            <a href="mailto:suporte@animecompass.com">
              <Mail className="w-5 h-5" />
              Contatar Suporte
            </a>
          </Button>
        </div>

        {/* Informações adicionais */}
        <div className="mt-8 p-4 rounded-lg bg-muted/30 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-muted-foreground/70 text-sm">
            🔧 Manutenção programada para melhorias de desempenho
          </p>
          <p className="text-muted-foreground/50 text-xs mt-2">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
