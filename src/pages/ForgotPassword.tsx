import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Sparkles, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';

// Schema de validação para email
const emailSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
});

/**
 * Página de recuperação de senha
 * Permite que usuários solicitem um link de reset de senha por email
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Envia email de recuperação de senha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Valida o email antes de enviar
      const validation = emailSchema.safeParse({ email });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      // Configura a URL de redirecionamento para a página de reset
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error('Erro ao enviar email. Tente novamente.');
      } else {
        setEmailSent(true);
        toast.success('Email de recuperação enviado!');
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Recuperar senha
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-border/50">
          {emailSent ? (
            // Estado de sucesso - email enviado
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Email enviado!</h2>
              <p className="text-muted-foreground text-sm">
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Verifique sua caixa de entrada e spam.
              </p>
              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Enviar novamente
                </Button>
                <Link to="/auth">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Formulário de recuperação
            <>
              <p className="text-muted-foreground text-sm mb-6 text-center">
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/80">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="glow"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link 
                  to="/auth" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
