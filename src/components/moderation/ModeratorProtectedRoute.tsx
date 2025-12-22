import { Navigate } from "react-router-dom";
import { useIsModerator } from "@/hooks/useModeration";
import { useAuth } from "@/hooks/useAuth";
import { GenericSkeleton } from "@/components/ui/skeletons";

interface ModeratorProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Componente de rota protegida para moderadores e admins
 * Redireciona para dashboard se o usuário não for moderador/admin
 */
export function ModeratorProtectedRoute({ children }: ModeratorProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: isModerator, isLoading: moderatorLoading } = useIsModerator();

  // Exibe loading enquanto verifica autenticação e role
  if (authLoading || moderatorLoading) {
    return <GenericSkeleton />;
  }

  // Se não estiver logado, redireciona para login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se não for moderador/admin, redireciona para dashboard
  if (!isModerator) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
