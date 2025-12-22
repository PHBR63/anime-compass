import { cn } from "@/lib/utils";

interface SakuraSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

/**
 * Spinner animado com pétalas de sakura girando
 * @param size - Tamanho do spinner: sm, md, lg, xl
 * @param text - Texto opcional exibido abaixo do spinner
 */
export function SakuraSpinner({ size = "md", className, text }: SakuraSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const petalSizes = {
    sm: "w-2 h-3",
    md: "w-3 h-4",
    lg: "w-4 h-5",
    xl: "w-5 h-7",
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Pétalas de sakura girando */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 sakura-petal-orbit"
            style={{
              animationDelay: `${i * 0.15}s`,
              transform: `rotate(${i * 72}deg)`,
            }}
          >
            <div
              className={cn(
                "sakura-petal absolute top-0 left-1/2 -translate-x-1/2",
                petalSizes[size]
              )}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          </div>
        ))}
        
        {/* Centro com ícone torii estilizado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/3 h-1/3 rounded-full bg-gradient-to-br from-sakura to-torii opacity-60 animate-pulse" />
        </div>
      </div>
      
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}

/**
 * Spinner de sakura centralizado em tela cheia
 */
export function SakuraSpinnerFullscreen({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SakuraSpinner size="xl" text={text} />
    </div>
  );
}

/**
 * Spinner de sakura para overlay em containers
 */
export function SakuraSpinnerOverlay({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <SakuraSpinner size="lg" text={text} />
    </div>
  );
}
