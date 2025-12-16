import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Componente de avaliação por estrelas (1-5)
export function StarRating({ rating, onRatingChange, readonly = false, size = 'md' }: StarRatingProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      // Se clicar na mesma estrela, remove a nota
      onRatingChange(value === rating ? 0 : value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          disabled={readonly}
          onClick={() => handleClick(value)}
          className={cn(
            "transition-all duration-200",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizes[size],
              "transition-colors",
              value <= rating
                ? "text-warning fill-warning"
                : "text-muted-foreground/40 hover:text-warning/60"
            )}
          />
        </button>
      ))}
    </div>
  );
}
