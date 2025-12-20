import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimeEntriesProvider } from "@/contexts/AnimeEntriesContext";
import { AchievementCelebrationProvider } from "@/contexts/AchievementCelebrationContext";
import { HelpProvider } from "@/contexts/HelpContext";
import { WelcomeModal, HelpPanel, TourOverlay, HelpButton } from "@/components/help";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { InstallBanner, OfflineIndicator } from "@/components/pwa";

/**
 * Lazy loading das páginas para code-splitting
 * Cada página será carregada apenas quando acessada
 */
const Index = lazy(() => import("./pages/Index"));
const MyList = lazy(() => import("./pages/MyList"));
const ListDetailPage = lazy(() => import("./pages/ListDetailPage"));
const Franchises = lazy(() => import("./pages/Franchises"));
const Studios = lazy(() => import("./pages/Studios"));
const Discover = lazy(() => import("./pages/Discover"));
const Social = lazy(() => import("./pages/Social"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Profile = lazy(() => import("./pages/Profile"));
const Auth = lazy(() => import("./pages/Auth"));
const PublicListView = lazy(() => import("./pages/PublicListView"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const Chat = lazy(() => import("./pages/Chat"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Install = lazy(() => import("./pages/Install"));

/**
 * Componente de loading para Suspense
 * Exibido enquanto a página está sendo carregada
 */
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
    </div>
  </div>
);

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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Rotas públicas */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/u/:username" element={<PublicProfilePage />} />
                  <Route path="/shared/list/:listId" element={<PublicListView />} />
                  
                  {/* Rota pública - Landing/Dashboard */}
                  <Route path="/" element={<Index />} />
                  
                  {/* Rotas protegidas com Provider de AnimeEntries */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <AnimeEntriesProvider>
                          <MainLayout>
                            <Routes>
                              <Route path="/list" element={<MyList />} />
                              <Route path="/list/:id" element={<ListDetailPage />} />
                              <Route path="/list/franchises" element={<Franchises />} />
                              <Route path="/list/studios" element={<Studios />} />
                              <Route path="/discover" element={<Discover />} />
                              <Route path="/reviews" element={<Reviews />} />
                              <Route path="/social" element={<Social />} />
                              <Route path="/chat" element={<Chat />} />
                              <Route path="/achievements" element={<Achievements />} />
                              <Route path="/profile" element={<Profile />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
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
