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
import { SakuraPetals, WavePattern } from '@/components/backgrounds';
import { NeonText } from '@/components/animations';

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

/**
 * Página de Autenticação com estética oriental
 * Inclui pétalas de sakura caindo e elementos decorativos japoneses
 */
export default function Auth() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  
  const [isLogin, setIsLogin] = useState(!inviteCode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  });
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { data: inviteData } = useCheckInviteCode(inviteCode);
  const acceptInvite = useAcceptInvite();
  
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

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
    setLoginError(null);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message, { duration: 5000 });
          setIsLoading(false);
          return;
        }

        localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
        
        const { error } = await signIn(email, password, rememberMe);
        if (error) {
          const errorMsg = error.message.includes('Invalid login credentials')
            ? 'Email ou senha incorretos. Verifique suas credenciais.'
            : error.message;
          
          setLoginError(errorMsg);
          toast.error(errorMsg, { duration: 7000 });
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
          if (inviteCode) {
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
        <div className="animate-pulse text-primary font-zen">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4 md:p-6">
      {/* Background com pétalas de sakura */}
      <div className="absolute inset-0 pointer-events-none">
        <SakuraPetals
          petalCount={35}
          colors={['hsl(350, 100%, 85%)', 'hsl(350, 90%, 80%)', 'hsl(355, 100%, 90%)']}
          speed={0.6}
          windStrength={0.3}
          minSize={8}
          maxSize={14}
          opacity={0.6}
        />
      </div>

      {/* Pattern de ondas japonesas */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <WavePattern 
          color="hsl(var(--sakura))"
          opacity={0.04}
          size={60}
        />
      </div>

      {/* Elementos decorativos - círculos com glow sakura */}
      <div className="absolute top-1/4 -left-16 md:-left-32 w-48 md:w-96 h-48 md:h-96 bg-sakura/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-16 md:-right-32 w-48 md:w-96 h-48 md:h-96 bg-torii/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      
      {/* Decoração estilo Torii no topo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 md:w-48 h-1 bg-gradient-to-r from-transparent via-torii/50 to-transparent" />
      
      <div className="w-full max-w-sm md:max-w-md relative z-10">
        {/* Mensagem de acesso restrito */}
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
          <div className="mb-6 p-4 rounded-lg bg-sakura/10 border border-sakura/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-sakura/20">
                <Gift className="w-5 h-5 text-sakura" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-sakura font-zen">
                  あなたは招待されました！
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
          </div>
        )}

        {/* Logo com estilo oriental */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-sakura animate-pulse" />
            <NeonText 
              color="sakura" 
              intensity="medium" 
              animated={true}
              className="text-3xl md:text-4xl font-bold font-zen"
            >
              AniCheck
            </NeonText>
          </div>
          <p className="text-sm md:text-base text-muted-foreground font-zen">
            {isLogin ? 'おかえりなさい！' : 'アカウントを作成'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </p>
        </div>

        {/* Form Card com borda estilo kintsugi */}
        <div className="glass-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-sakura/20 relative overflow-hidden">
          {/* Decoração kintsugi sutil */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-kintsugi/20 to-transparent rounded-bl-full" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground/80 font-zen">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="seu_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-background/50 border-sakura/30 focus:border-sakura"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80 font-zen">Email</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${loginError ? 'text-destructive' : 'text-muted-foreground'}`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-10 bg-background/50 focus:border-sakura ${
                    loginError ? 'border-destructive/50 focus:border-destructive' : 'border-sakura/30'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80 font-zen">Senha</Label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${loginError ? 'text-destructive' : 'text-muted-foreground'}`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`pl-10 pr-10 bg-background/50 focus:border-sakura ${
                    loginError ? 'border-destructive/50 focus:border-destructive' : 'border-sakura/30'
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
              {!isLogin && <PasswordStrengthIndicator password={password} />}
            </div>

            {isLogin && loginError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-sm text-destructive font-medium">{loginError}</p>
                <button 
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-sakura hover:underline mt-2 flex items-center gap-1"
                >
                  Esqueceu sua senha? Clique aqui para redefinir
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground/80 font-zen">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-background/50 border-sakura/30 focus:border-sakura"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-sakura to-torii hover:from-sakura/90 hover:to-torii/90 text-white font-zen"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? '入っています...' : 'アカウント作成中...'}
                </span>
              ) : (
                isLogin ? '入る (Entrar)' : 'アカウント作成 (Criar Conta)'
              )}
            </Button>

            {isLogin && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="border-sakura/50 data-[state=checked]:bg-sakura data-[state=checked]:border-sakura"
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
                    className="text-sm text-muted-foreground hover:text-sakura transition-colors"
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
              className="text-sm text-muted-foreground hover:text-sakura transition-colors"
            >
              {isLogin ? (
                <>Não tem uma conta? <span className="text-sakura font-medium font-zen">登録する</span></>
              ) : (
                <>Já tem uma conta? <span className="text-sakura font-medium font-zen">ログイン</span></>
              )}
            </button>
          </div>
        </div>

        {/* Decoração inferior */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/50 font-zen">✧ アニチェック ✧</p>
        </div>
      </div>
    </div>
  );
}
