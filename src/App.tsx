import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimeEntriesProvider } from "@/contexts/AnimeEntriesContext";
import { AchievementCelebrationProvider } from "@/contexts/AchievementCelebrationContext";
import { HelpProvider } from "@/contexts/HelpContext";
import { WelcomeModal, HelpPanel, TourOverlay, HelpButton } from "@/components/help";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { InstallBanner, OfflineIndicator } from "@/components/pwa";
import { AnimatedRoutes } from "@/components/animations/AnimatedRoutes";
import { PageTransition } from "@/components/animations/PageTransition";
import { NotificationClickHandler } from "@/components/notifications/NotificationClickHandler";
import {
  DashboardSkeleton,
  ListSkeleton,
  DiscoverSkeleton,
  ProfileSkeleton,
  ChatSkeleton,
  AuthSkeleton,
  GenericSkeleton,
} from "@/components/ui/skeletons";

/**
 * Lazy loading das páginas para code-splitting
 * Cada página será carregada apenas quando acessada
 */
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const PublicListView = lazy(() => import("./pages/PublicListView"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Install = lazy(() => import("./pages/Install"));

/**
 * Prefetch das rotas mais acessadas
 * Carrega os chunks em background para navegação mais rápida
 */
const prefetchRoutes = () => {
  // Prefetch após 2 segundos de idle
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
  
  idleCallback(() => {
    // Rotas prioritárias para prefetch
    import("./pages/Dashboard");
    import("./pages/MyList");
    import("./pages/Discover");
  });
};

/**
 * Componente para gerenciar prefetch baseado na navegação
 */
function RoutePrefetcher() {
  const location = useLocation();

  useEffect(() => {
    // Prefetch rotas relacionadas baseado na rota atual
    const prefetchRelated = () => {
      switch (location.pathname) {
        case "/":
          // Na home, prefetch das principais rotas
          import("./pages/MyList");
          import("./pages/Discover");
          break;
        case "/list":
          // Na lista, prefetch de detalhes e descobrir
          import("./pages/ListDetailPage");
          import("./pages/Franchises");
          break;
        case "/discover":
          // No descobrir, prefetch da lista
          import("./pages/MyList");
          break;
        case "/social":
          // No social, prefetch do chat
          import("./pages/Chat");
          break;
      }
    };

    // Delay para não competir com o carregamento atual
    const timer = setTimeout(prefetchRelated, 1000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}

/**
 * Componente de loading contextual para Suspense
 * Exibe skeleton específico baseado na rota
 */
function ContextualLoader() {
  const location = useLocation();
  
  // Mapeia rotas para skeletons específicos
  if (location.pathname === "/" || location.pathname === "/dashboard") {
    return <DashboardSkeleton />;
  }
  if (location.pathname.startsWith("/list")) {
    return <ListSkeleton />;
  }
  if (location.pathname === "/discover") {
    return <DiscoverSkeleton />;
  }
  if (location.pathname === "/profile") {
    return <ProfileSkeleton />;
  }
  if (location.pathname === "/chat") {
    return <ChatSkeleton />;
  }
  if (location.pathname === "/auth") {
    return <AuthSkeleton />;
  }
  
  return <GenericSkeleton />;
}

/**
 * QueryClient com configurações otimizadas para performance
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo padrão antes de considerar dados "stale"
      staleTime: 1000 * 60 * 5, // 5 minutos
      // Tempo que dados ficam em cache após não serem mais usados
      gcTime: 1000 * 60 * 30, // 30 minutos
      // Não refetch automaticamente em focus/reconexão para reduzir requisições
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Retry apenas 1 vez em caso de erro
      retry: 1,
      // Retry delay exponencial
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry apenas 1 vez para mutations
      retry: 1,
    },
  },
});

// Inicia prefetch quando o app carrega
if (typeof window !== "undefined") {
  prefetchRoutes();
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AchievementCelebrationProvider>
        <HelpProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {/* Componentes PWA */}
            <OfflineIndicator />
            <InstallBanner />
            {/* Componentes globais de ajuda */}
            <WelcomeModal />
            <HelpPanel />
            <TourOverlay />
            <HelpButton />
            <BrowserRouter>
              {/* Handler para cliques em notificações do SW */}
              <NotificationClickHandler />
              {/* Prefetcher de rotas relacionadas */}
              <RoutePrefetcher />
              <Suspense fallback={<GenericSkeleton />}>
                <Routes>
                  {/* Rotas públicas */}
                  <Route path="/auth" element={
                    <Suspense fallback={<AuthSkeleton />}>
                      <Auth />
                    </Suspense>
                  } />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/u/:username" element={
                    <Suspense fallback={<ProfileSkeleton />}>
                      <PublicProfilePage />
                    </Suspense>
                  } />
                  <Route path="/shared/list/:listId" element={
                    <Suspense fallback={<ListSkeleton />}>
                      <PublicListView />
                    </Suspense>
                  } />
                  
                  {/* Rota pública - Landing/Dashboard */}
                  <Route path="/" element={
                    <Suspense fallback={<DashboardSkeleton />}>
                      <Index />
                    </Suspense>
                  } />
                  
                  {/* Rotas protegidas com Provider de AnimeEntries */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <AnimeEntriesProvider>
                          <MainLayout>
                            <AnimatedRoutes />
                          </MainLayout>
                        </AnimeEntriesProvider>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </HelpProvider>
      </AchievementCelebrationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
