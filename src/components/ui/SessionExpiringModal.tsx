import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, LogOut } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionExpiringModalProps {
  /** Tempo em segundos antes da expiração para mostrar o aviso (padrão: 5 minutos) */
  warningThreshold?: number;
  /** Callback quando a sessão é renovada */
  onSessionRenewed?: () => void;
}

/**
 * Modal que avisa o usuário quando a sessão está prestes a expirar.
 * Permite renovar a sessão ou fazer logout.
 */
export function SessionExpiringModal({ 
  warningThreshold = 300, // 5 minutos
  onSessionRenewed 
}: SessionExpiringModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRenewing, setIsRenewing] = useState(false);
  const navigate = useNavigate();

  /**
   * Verifica se a sessão está prestes a expirar
   */
  const checkSessionExpiry = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.expires_at) return;

      const expiresAt = session.expires_at * 1000; // Converte para milissegundos
      const now = Date.now();
      const timeUntilExpiry = Math.floor((expiresAt - now) / 1000);

      // Se falta menos que o threshold, mostra o modal
      if (timeUntilExpiry > 0 && timeUntilExpiry <= warningThreshold) {
        setTimeLeft(timeUntilExpiry);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Erro ao verificar expiração da sessão:', error);
    }
  }, [warningThreshold]);

  /**
   * Renova a sessão do usuário
   */
  const handleRenewSession = async () => {
    setIsRenewing(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (data.session) {
        toast.success('Sessão renovada com sucesso!');
        setIsOpen(false);
        onSessionRenewed?.();
      }
    } catch (error) {
      console.error('Erro ao renovar sessão:', error);
      toast.error('Não foi possível renovar a sessão. Faça login novamente.');
      handleLogout();
    } finally {
      setIsRenewing(false);
    }
  };

  /**
   * Faz logout do usuário
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    navigate('/auth');
  };

  // Verifica expiração periodicamente
  useEffect(() => {
    checkSessionExpiry();
    const interval = setInterval(checkSessionExpiry, 30000); // Verifica a cada 30 segundos
    return () => clearInterval(interval);
  }, [checkSessionExpiry]);

  // Countdown do tempo restante
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  /**
   * Formata o tempo restante para exibição
   */
  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcula a porcentagem de tempo restante
  const progressValue = (timeLeft / warningThreshold) * 100;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-xl">
              Sessão expirando
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Sua sessão irá expirar em breve. Deseja continuar conectado?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tempo restante:</span>
            <span className="font-mono text-lg font-bold text-warning">
              {formatTimeLeft(timeLeft)}
            </span>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2"
          />
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
          <Button
            variant="glow"
            onClick={handleRenewSession}
            disabled={isRenewing}
            className="w-full sm:w-auto"
          >
            {isRenewing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Renovando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Continuar conectado
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
