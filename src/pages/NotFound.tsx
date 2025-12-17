import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Página de erro 404 personalizada
 * Exibida quando o usuário tenta acessar uma rota que não existe
 */
const NotFound = () => {
  const location = useLocation();

  // Registra erro 404 no console para debug
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      
      {/* Conteúdo principal */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Número 404 estilizado */}
        <div className="relative mb-8">
          <h1 className="text-[12rem] md:text-[16rem] font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary via-accent to-primary leading-none select-none animate-float">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Compass className="w-20 h-20 md:w-28 md:h-28 text-primary/50 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        {/* Mensagem de erro */}
        <div className="glass-card p-8 rounded-2xl mb-8 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Oops! Página não encontrada
          </h2>
          <p className="text-muted-foreground text-lg mb-2">
            Parece que você se perdeu no mundo dos animes...
          </p>
          <p className="text-muted-foreground/70 text-sm">
            A página <code className="bg-muted px-2 py-1 rounded text-primary">{location.pathname}</code> não existe.
          </p>
        </div>

        {/* Botões de navegação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button
            asChild
            size="lg"
            className="gap-2 glow-primary"
          >
            <Link to="/">
              <Home className="w-5 h-5" />
              Voltar ao Início
            </Link>
          </Button>
          
          <Button
            asChild
            variant="outline"
            size="lg"
            className="gap-2 gradient-border"
          >
            <Link to="/discover">
              <Search className="w-5 h-5" />
              Descobrir Animes
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Button>
        </div>

        {/* Dica */}
        <p className="text-muted-foreground/50 text-sm mt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          💡 Dica: Use a barra de navegação para explorar o aplicativo
        </p>
      </div>
    </div>
  );
};

export default NotFound;
