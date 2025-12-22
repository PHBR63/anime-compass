import { cn } from "@/lib/utils";

/**
 * Variantes de skeleton com animações temáticas sakura
 */
type SkeletonVariant = "default" | "sakura" | "shimmer" | "pulse" | "wave";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

/**
 * Componente Skeleton com animações personalizadas na paleta sakura
 * @param variant - Tipo de animação: default, sakura, shimmer, pulse, wave
 */
function Skeleton({ className, variant = "sakura", ...props }: SkeletonProps) {
  const variantClasses: Record<SkeletonVariant, string> = {
    default: "animate-pulse bg-muted",
    sakura: "skeleton-sakura",
    shimmer: "skeleton-shimmer",
    pulse: "skeleton-pulse",
    wave: "skeleton-wave",
  };

  return (
    <div
      className={cn(
        "rounded-md",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton circular para avatares
 */
function SkeletonAvatar({ className, variant = "sakura", ...props }: SkeletonProps) {
  return (
    <Skeleton
      variant={variant}
      className={cn("h-10 w-10 rounded-full", className)}
      {...props}
    />
  );
}

/**
 * Skeleton para textos/linhas
 */
function SkeletonText({ className, variant = "sakura", lines = 1, ...props }: SkeletonProps & { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-4/5" : "w-full",
            className
          )}
          style={{ animationDelay: `${i * 100}ms` }}
          {...props}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton para cards de anime
 */
function SkeletonAnimeCard({ className, variant = "sakura" }: SkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton variant={variant} className="aspect-[3/4] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton variant={variant} className="h-4 w-3/4" style={{ animationDelay: "100ms" }} />
        <Skeleton variant={variant} className="h-3 w-1/2" style={{ animationDelay: "200ms" }} />
      </div>
    </div>
  );
}

/**
 * Skeleton para stat cards
 */
function SkeletonStatCard({ className, variant = "sakura" }: SkeletonProps) {
  return (
    <div className={cn("glass-card p-6 space-y-3", className)}>
      <Skeleton variant={variant} className="h-4 w-1/2" />
      <Skeleton variant={variant} className="h-8 w-3/4" style={{ animationDelay: "100ms" }} />
      <Skeleton variant={variant} className="h-3 w-2/3" style={{ animationDelay: "200ms" }} />
    </div>
  );
}

export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonAnimeCard, SkeletonStatCard };
