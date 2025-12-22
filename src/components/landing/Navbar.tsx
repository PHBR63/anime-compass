import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

/**
 * Navbar da landing page
 * Exibe logo e botões de navegação para login/cadastro
 */
export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <Logo variant="full" size="lg" />
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
