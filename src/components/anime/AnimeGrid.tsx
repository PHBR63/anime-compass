import { AnimeCard } from './AnimeCard';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];

interface AnimeGridProps {
  entries: AnimeEntry[];
  className?: string;
}

export function AnimeGrid({ entries, className }: AnimeGridProps) {
  if (entries.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground">Nenhum anime encontrado</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6",
      className
    )}>
      {entries.map((entry, index) => (
        <div 
          key={entry.id}
          className={index < 12 ? 'animate-scale-in' : undefined}
          style={index < 12 ? { animationDelay: `${index * 50}ms` } : undefined}
        >
          <AnimeCard entry={entry} />
        </div>
      ))}
    </div>
  );
}
