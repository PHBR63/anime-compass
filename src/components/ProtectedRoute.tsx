import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSessionCheck } from '@/hooks/useSessionCheck';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Componente que protege rotas autenticadas.
 * Redireciona para /auth se não houver usuário logado.
 * Verifica automaticamente se a sessão expirou.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Verifica sessão automaticamente e redireciona se expirar
  useSessionCheck();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
