import { useAuth } from '@/hooks/useAuth';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import { MainLayout } from '@/components/layout/MainLayout';

/**
 * Página Index - redireciona para Dashboard ou Landing
 * baseado no estado de autenticação do usuário
 */
const Index = () => {
  const { user, loading } = useAuth();

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Usuário logado vê o Dashboard com layout, não logado vê a Landing
  if (user) {
    return (
      <MainLayout>
        <Dashboard />
      </MainLayout>
    );
  }

  return <LandingPage />;
};

export default Index;
