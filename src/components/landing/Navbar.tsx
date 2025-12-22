import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

/**
 * Navbar da landing page
 * Exibe logo e botões de navegação com estética oriental
 */
export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <Logo variant="full" size="lg" theme="light" />
        </Link>

        {/* Botões de ação com estilo oriental */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="text-foreground hover:text-primary">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button variant="torii" asChild className="hidden sm:inline-flex">
            <Link to="/auth">Começar Grátis</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
