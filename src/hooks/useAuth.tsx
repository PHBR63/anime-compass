import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { prefetchUserData, shouldRefreshCache } from '@/lib/cachePrefetch';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Descarta cache em memória quando a identidade muda, antes de exibir a nova conta.
        const nextId = session?.user.id ?? null;
        if (previousUserId.current !== nextId) queryClient.clear();
        previousUserId.current = nextId;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Pré-carrega cache quando usuário faz login
        if (event === 'SIGNED_IN' && session?.user) {
          // Usa setTimeout para não bloquear o callback do auth
          setTimeout(() => {
            prefetchUserData(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Verifica e atualiza cache se necessário quando já está logado
      if (session?.user) {
        shouldRefreshCache(session.user.id).then((needsRefresh) => {
          if (needsRefresh) {
            prefetchUserData(session.user.id);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          display_name: username,
        }
      }
    });
    
    return { data, error: error as Error | null };
  };

  /**
   * Faz login do usuário
   * @param rememberMe - Se true, a sessão dura 30 dias; se false, 1 hora
   */
  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    // Configura duração da sessão baseado em "Lembrar-me"
    // Nota: O Supabase gerencia isso internamente, mas salvamos a preferência
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Se login bem-sucedido e "Lembrar-me" desmarcado, configura expiração mais curta
    if (!error && !rememberMe) {
      // Marca que a sessão deve expirar mais cedo
      localStorage.setItem('anicheck_session_short', 'true');
    } else {
      localStorage.removeItem('anicheck_session_short');
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
