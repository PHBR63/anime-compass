import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCheckInviteCode, useAcceptInvite } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ShieldAlert, Gift, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/auth/PasswordStrengthIndicator';

// Chave para armazenar preferência de "Lembrar-me"
const REMEMBER_ME_KEY = 'anicheck_remember_me';

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

// Schema de validação para cadastro - alinhado com requisitos de força (8 caracteres)
const signupSchema = loginSchema.extend({
  username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres').max(20, 'Username deve ter no máximo 20 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  
  const [isLogin, setIsLogin] = useState(!inviteCode); // Se tem convite, começa no cadastro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null); // Erro persistente para feedback visual
  const [rememberMe, setRememberMe] = useState(() => {
    // Recupera preferência salva
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  });
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Verificar código de convite
  const { data: inviteData } = useCheckInviteCode(inviteCode);
  const acceptInvite = useAcceptInvite();
  
  // Obtém a rota de origem para redirecionar após login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    // Se usuário já está logado, redireciona para a página de origem
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  // Limpa o erro quando usuário começa a digitar
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (loginError) setLoginError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (loginError) setLoginError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null); // Limpa erro anterior

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message, { duration: 5000 });
          setIsLoading(false);
          return;
        }

        // Salva preferência de "Lembrar-me"
        localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
        
        const { error } = await signIn(email, password, rememberMe);
        if (error) {
          // Mensagem amigável para credenciais inválidas
          const errorMsg = error.message.includes('Invalid login credentials')
            ? 'Email ou senha incorretos. Verifique suas credenciais.'
            : error.message;
          
          setLoginError(errorMsg); // Erro persistente para feedback visual
          toast.error(errorMsg, { duration: 7000 }); // Toast com duração maior
        } else {
          toast.success('Login realizado com sucesso!');
          navigate(from, { replace: true });
        }
      } else {
        const validation = signupSchema.safeParse({ email, password, confirmPassword, username });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        // Verifica força da senha antes de criar conta (80% = 4 de 5 requisitos)
        if (!isPasswordStrong(password)) {
          toast.error('Senha muito fraca. Atenda a pelo menos 4 dos 5 requisitos de segurança.');
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, username);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error(error.message);
          }
        } else {
          // Se tem código de convite, aceitar convite após criar conta
          if (inviteCode) {
            // Aguarda um pouco para o usuário ser criado e busca o ID
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (newUser) {
              try {
                await acceptInvite.mutateAsync({
                  inviteCode,
                  userId: newUser.id,
                });
              } catch (inviteError) {
                console.error('Erro ao aceitar convite:', inviteError);
              }
            }
          }
          toast.success('Conta criada com sucesso!');
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4 md:p-6">
      {/* Background effects - otimizado para mobile */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-1/4 -left-16 md:-left-32 w-48 md:w-96 h-48 md:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-16 md:-right-32 w-48 md:w-96 h-48 md:h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" />
      
      <div className="w-full max-w-sm md:max-w-md relative z-10">
        {/* Mensagem de acesso restrito quando redirecionado */}
        {from !== '/' && !inviteCode && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              Faça login para acessar este conteúdo protegido.
            </p>
          </div>
        )}

        {/* Banner de convite */}
        {inviteData && !isLogin && (
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                  Você foi convidado!
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={(inviteData as any).profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {((inviteData as any).profiles?.display_name || 'U').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {(inviteData as any).profiles?.display_name || (inviteData as any).profiles?.username || 'Um usuário'} te convidou para o AniCheck
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Crie sua conta para se tornar amigo automaticamente!
            </p>
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary animate-glow" />
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">AniCheck</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-border/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground/80">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="seu_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80">Email</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${loginError ? 'text-destructive' : 'text-muted-foreground'}`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-10 bg-background/50 focus:border-primary ${
                    loginError ? 'border-destructive/50 focus:border-destructive' : 'border-border/50'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80">Senha</Label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${loginError ? 'text-destructive' : 'text-muted-foreground'}`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`pl-10 pr-10 bg-background/50 focus:border-primary ${
                    loginError ? 'border-destructive/50 focus:border-destructive' : 'border-border/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Indicador de força da senha apenas no cadastro */}
              {!isLogin && <PasswordStrengthIndicator password={password} />}
            </div>

            {/* Mensagem de erro inline para login */}
            {isLogin && loginError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-sm text-destructive font-medium">{loginError}</p>
                <button 
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary hover:underline mt-2 flex items-center gap-1"
                >
                  Esqueceu sua senha? Clique aqui para redefinir
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground/80">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                  />
                </div>
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
                  {isLogin ? 'Entrando...' : 'Criando conta...'}
                </span>
              ) : (
                isLogin ? 'Entrar' : 'Criar Conta'
              )}
            </Button>

            {isLogin && (
              <div className="space-y-4">
                {/* Opção Lembrar-me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label 
                      htmlFor="remember-me" 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Lembrar-me
                    </Label>
                  </div>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground/70 text-center">
                  {rememberMe 
                    ? 'Sua sessão permanecerá ativa por 30 dias' 
                    : 'Sua sessão expirará após 1 hora de inatividade'}
                </p>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? (
                <>Não tem uma conta? <span className="text-primary font-medium">Cadastre-se</span></>
              ) : (
                <>Já tem uma conta? <span className="text-primary font-medium">Entre</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
