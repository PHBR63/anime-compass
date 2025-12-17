import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimeEntriesProvider } from "@/contexts/AnimeEntriesContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import MyList from "./pages/MyList";
import Franchises from "./pages/Franchises";
import Studios from "./pages/Studios";
import Discover from "./pages/Discover";
import Social from "./pages/Social";
import Achievements from "./pages/Achievements";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import PublicListView from "./pages/PublicListView";
import PublicProfilePage from "./pages/PublicProfilePage";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/maintenance" element={<Maintenance />} />
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
                        <Route path="/list/franchises" element={<Franchises />} />
                        <Route path="/list/studios" element={<Studios />} />
                        <Route path="/discover" element={<Discover />} />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
