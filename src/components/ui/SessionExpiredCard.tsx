import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SessionExpiredCardProps {
  /** Título opcional do card */
  title?: string;
  /** Mensagem customizada */
  message?: string;
  /** Ícone opcional para exibir no header */
  icon?: React.ReactNode;
  /** Classe CSS adicional para o container */
  className?: string;
}

/**
 * Componente reutilizável para exibir quando a sessão do usuário expira.
 * Mostra uma mensagem amigável com botão para fazer login novamente.
 */
export function SessionExpiredCard({ 
  title,
  message = 'Sua sessão expirou. Faça login novamente para continuar.',
  icon,
  className = ''
}: SessionExpiredCardProps) {
  const navigate = useNavigate();

  return (
    <section className={`glass-card p-4 md:p-6 rounded-xl border border-destructive/20 bg-destructive/5 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon}
          {title && (
            <h2 className="font-display text-lg md:text-xl font-semibold">{title}</h2>
          )}
        </div>
      )}
      <div className="flex flex-col items-center gap-4 py-6 md:py-8">
        <div className="text-center">
          <p className="text-muted-foreground text-sm md:text-base mb-2">
            {message}
          </p>
        </div>
        <Button 
          onClick={() => navigate('/auth')}
          className="gap-2"
        >
          <LogIn className="h-4 w-4" />
          Fazer login novamente
        </Button>
      </div>
    </section>
  );
}

/**
 * Utilitário para verificar se um erro é relacionado a sessão expirada.
 */
export function isSessionExpiredError(error: Error | null | undefined): boolean {
  if (!error?.message) return false;
  
  const sessionErrorPatterns = [
    'Sessão expirada',
    'login novamente',
    '401',
    'Usuário não encontrado',
    'sessão inválida',
    'Unauthorized',
    'not authenticated'
  ];
  
  return sessionErrorPatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}
