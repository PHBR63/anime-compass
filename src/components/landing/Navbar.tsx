import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

/**
 * Navbar da landing page
 * Exibe logo e botões de navegação para login/cadastro
 */
export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-primary-foreground font-bold text-xl">A</span>
          </div>
          <span className="font-display text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AniCheck
          </span>
        </Link>

        {/* Botões de ação */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button variant="glow" asChild className="hidden sm:inline-flex">
            <Link to="/auth">Começar Grátis</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
