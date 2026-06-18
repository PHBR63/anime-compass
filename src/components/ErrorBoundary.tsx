import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Interface para as props do ErrorBoundary
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  // Fallback customizado opcional
  fallback?: ReactNode;
}

/**
 * Interface para o estado do ErrorBoundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Função para registrar erro no banco de dados
 * Importada de forma assíncrona para evitar dependências circulares
 */
const logErrorToDatabase = async (
  errorMessage: string,
  errorStack?: string,
  errorContext?: Record<string, unknown>
) => {
  try {
    // Import dinâmico para evitar problemas de inicialização
    const { supabase } = await import("@/integrations/supabase/client");
    
    await supabase.rpc("log_error", {
      p_error_message: errorMessage,
      p_error_stack: errorStack || null,
      p_error_context: errorContext ? JSON.parse(JSON.stringify(errorContext)) : null,
      p_url: window.location.href,
      p_user_agent: navigator.userAgent,
    });
    
    console.log("[ErrorBoundary] Erro registrado no banco de dados");
  } catch (logError) {
    // Se falhar ao registrar, apenas loga no console
    console.error("[ErrorBoundary] Falha ao registrar erro no banco:", logError);
  }
};

/**
 * ErrorBoundary - Componente para capturar erros React globalmente
 * 
 * Captura erros durante a renderização, em lifecycle methods e em construtores
 * de toda a árvore de componentes filhos. Registra automaticamente no banco de dados.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Atualiza o estado quando um erro é capturado
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Captura informações do erro e registra no banco
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Registra o erro no banco de dados
    logErrorToDatabase(
      error.message,
      error.stack,
      {
        componentStack: errorInfo.componentStack,
        errorName: error.name,
        timestamp: new Date().toISOString(),
      }
    );

    // Também loga no console para desenvolvimento
    console.error("[ErrorBoundary] Erro capturado:", error);
    console.error("[ErrorBoundary] Stack do componente:", errorInfo.componentStack);
  }

  /**
   * Reseta o estado de erro para tentar novamente
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Navega para a página inicial
   */
  handleGoHome = () => {
    window.location.href = "/";
  };

  /**
   * Recarrega a página
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Se tiver fallback customizado, usa ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão com UI amigável
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Ops! Algo deu errado</CardTitle>
              <CardDescription className="text-base">
                Ocorreu um erro inesperado. Não se preocupe, nossa equipe já foi notificada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Detalhes do erro (apenas em desenvolvimento) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="p-4 bg-muted rounded-lg overflow-auto max-h-40">
                  <p className="text-sm font-mono text-destructive">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={this.handleReload}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Página
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={this.handleGoHome}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ir para Início
                </Button>
              </div>

              {/* Informação adicional */}
              <p className="text-xs text-center text-muted-foreground">
                Se o problema persistir, tente limpar o cache do navegador ou entre em contato com o suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
