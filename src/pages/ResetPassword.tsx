import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Sparkles, Eye, EyeOff, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/auth/PasswordStrengthIndicator';

// Schema de validação para nova senha - alinhado com o indicador (8 caracteres)
const passwordSchema = z.object({
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

/**
 * Página de redefinição de senha
 * Usuário chega aqui após clicar no link de recuperação enviado por email
 */
export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [resetError, setResetError] = useState<string | null>(null); // Erro inline persistente
  
  const navigate = useNavigate();

  // Verifica se há uma sessão válida de recuperação de senha
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Se há uma sessão, o usuário veio do link de recuperação
      if (session) {
        setIsValidSession(true);
      }
      setIsCheckingSession(false);
    };

    // Escuta mudanças de autenticação (quando o link é clicado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
          setIsCheckingSession(false);
        }
      }
    );

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Traduz erros do Supabase para mensagens amigáveis
   */
  const getErrorMessage = (error: Error): string => {
    const msg = error.message.toLowerCase();
    
    if (msg.includes('password has been pwned') || msg.includes('pwned')) {
      return 'Esta senha foi encontrada em vazamentos de dados. Por segurança, escolha outra senha diferente.';
    }
    if (msg.includes('should be at least') || msg.includes('too short')) {
      return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (msg.includes('session') || msg.includes('expired') || msg.includes('token')) {
      return 'Sua sessão expirou. Por favor, solicite um novo link de recuperação.';
    }
    if (msg.includes('weak') || msg.includes('strength')) {
      return 'Senha muito fraca. Use letras maiúsculas, minúsculas, números e caracteres especiais.';
    }
    
    return 'Erro ao redefinir senha. Tente novamente ou solicite um novo link.';
  };

  // Atualiza a senha do usuário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResetError(null); // Limpa erro anterior

    try {
      // Valida as senhas antes de enviar
      const validation = passwordSchema.safeParse({ password, confirmPassword });
      if (!validation.success) {
        const errorMsg = validation.error.errors[0].message;
        setResetError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      // Verifica força da senha (80% = 4 de 5 requisitos)
      if (!isPasswordStrong(password)) {
        const errorMsg = 'Senha muito fraca. Atenda a pelo menos 4 dos 5 requisitos de segurança.';
        setResetError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        const errorMsg = getErrorMessage(error);
        setResetError(errorMsg);
        toast.error(errorMsg, { duration: 7000 });
      } else {
        setIsSuccess(true);
        toast.success('Senha redefinida com sucesso!');
        
        // Redireciona para a home após 3 segundos
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err) {
      const errorMsg = 'Erro inesperado. Tente novamente ou solicite um novo link.';
      setResetError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state enquanto verifica sessão
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Verificando...</p>
        </div>
      </div>
    );
  }

  // Se não há sessão válida, mostra mensagem de erro
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4 md:p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        <div className="w-full max-w-sm md:max-w-md relative z-10">
          <div className="glass-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-border/50 text-center">
            <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Link inválido ou expirado</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Este link de recuperação não é válido ou já expirou. 
              Solicite um novo link.
            </p>
            <Button variant="glow" onClick={() => navigate('/forgot-password')}>
              Solicitar novo link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4 md:p-6">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-1/4 -left-16 md:-left-32 w-48 md:w-96 h-48 md:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-16 md:-right-32 w-48 md:w-96 h-48 md:h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" />
      
      <div className="w-full max-w-sm md:max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary animate-glow" />
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">AniCheck</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Criar nova senha
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-border/50">
          {isSuccess ? (
            // Estado de sucesso
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Senha redefinida!</h2>
              <p className="text-muted-foreground text-sm">
                Sua senha foi alterada com sucesso. 
                Você será redirecionado automaticamente...
              </p>
              <div className="pt-4">
                <Button variant="glow" className="w-full" onClick={() => navigate('/')}>
                  Ir para o app
                </Button>
              </div>
            </div>
          ) : (
            // Formulário de nova senha
            <>
              <p className="text-muted-foreground text-sm mb-4 text-center">
                Digite sua nova senha abaixo.
              </p>

              {/* Aviso sobre senhas comprometidas */}
              <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Senhas fracas ou encontradas em vazamentos de dados serão automaticamente rejeitadas por segurança.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/80">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (resetError) setResetError(null);
                      }}
                      className="pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Indicador de força da senha */}
                  <PasswordStrengthIndicator password={password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground/80">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (resetError) setResetError(null);
                      }}
                      className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* Erro inline com opção de solicitar novo link */}
                {resetError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-sm text-destructive font-medium">{resetError}</p>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => navigate('/forgot-password')}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Solicitar novo link de recuperação
                    </Button>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="glow"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    'Redefinir senha'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
