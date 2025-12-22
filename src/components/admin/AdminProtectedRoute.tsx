import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { GenericSkeleton } from "@/components/ui/skeletons";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Componente de rota protegida para administradores
 * Redireciona para dashboard se o usuário não for admin
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  // Exibe loading enquanto verifica autenticação e role
  if (authLoading || adminLoading) {
    return <GenericSkeleton />;
  }

  // Se não estiver logado, redireciona para login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se não for admin, redireciona para dashboard
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
