import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useRealtimeNotifications } from '@/hooks/useNotifications';
import { SessionExpiringModal } from '@/components/ui/SessionExpiringModal';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Layout principal do app com sidebar e área de conteúdo
 * Otimizado para dispositivos móveis e desktop
 */
export function MainLayout({ children }: MainLayoutProps) {
  // Ativar escuta de notificações em tempo real
  useRealtimeNotifications();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Background effects - reduzido em mobile para performance */}
      <div className="fixed inset-0 bg-grid opacity-20 md:opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] md:w-[800px] h-[300px] md:h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[300px] md:w-[600px] h-[200px] md:h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      
      <Sidebar />
      
      {/* Área de conteúdo principal - padding ajustado para mobile */}
      <main className="md:pl-64 min-h-screen">
        <div className="container px-4 md:px-6 py-4 md:py-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Modal de aviso de sessão expirando */}
      <SessionExpiringModal warningThreshold={300} />
    </div>
  );
}
