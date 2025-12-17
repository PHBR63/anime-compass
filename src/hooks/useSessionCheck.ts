import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/**
 * Hook que verifica automaticamente se a sessão do usuário expirou.
 * Redireciona para a página de login quando a sessão expira.
 * 
 * @param options - Opções de configuração
 * @param options.redirectTo - Rota para redirecionar (padrão: '/auth')
 * @param options.showToast - Exibir toast quando sessão expirar (padrão: true)
 * @param options.checkInterval - Intervalo de verificação em ms (padrão: 60000 = 1 min)
 */
export function useSessionCheck(options?: {
  redirectTo?: string;
  showToast?: boolean;
  checkInterval?: number;
}) {
  const { redirectTo = '/auth', showToast = true, checkInterval = 60000 } = options || {};
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session } = useAuth();

  // Função para verificar sessão
  const checkSession = useCallback(async () => {
    // Ignora verificação se estiver na página de auth
    if (location.pathname === '/auth' || location.pathname === '/forgot-password' || location.pathname === '/reset-password') {
      return;
    }

    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error || !currentSession) {
        // Sessão inválida ou expirada
        if (showToast) {
          toast.warning('Sua sessão expirou. Faça login novamente.', {
            duration: 5000,
          });
        }
        navigate(redirectTo, { state: { from: location }, replace: true });
      }
    } catch (err) {
      console.error('Erro ao verificar sessão:', err);
    }
  }, [location.pathname, navigate, redirectTo, showToast]);

  // Escuta eventos de autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignora se estiver na página de auth
      if (location.pathname === '/auth' || location.pathname === '/forgot-password' || location.pathname === '/reset-password') {
        return;
      }

      // Sessão expirou ou usuário deslogou
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        if (showToast) {
          toast.warning('Sua sessão expirou. Faça login novamente.', {
            duration: 5000,
          });
        }
        navigate(redirectTo, { state: { from: location }, replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [location, navigate, redirectTo, showToast]);

  // Verificação periódica da sessão
  useEffect(() => {
    // Só verifica se há um usuário logado
    if (!user) return;

    // Verifica imediatamente
    checkSession();

    // Configura intervalo de verificação
    const intervalId = setInterval(checkSession, checkInterval);

    return () => clearInterval(intervalId);
  }, [user, checkSession, checkInterval]);

  // Verifica sessão quando a janela ganha foco
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        checkSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, checkSession]);

  return { checkSession };
}

/**
 * Hook simplificado que apenas retorna se a sessão é válida.
 * Não faz redirecionamento automático.
 */
export function useIsSessionValid() {
  const { session } = useAuth();
  
  const checkValidity = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      return !error && !!currentSession;
    } catch {
      return false;
    }
  }, []);

  return {
    isValid: !!session,
    checkValidity,
  };
}
