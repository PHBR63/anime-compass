import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

interface StatusFilterProps {
  activeStatus: AnimeStatus | 'all';
  onChange: (status: AnimeStatus | 'all') => void;
  counts: Record<AnimeStatus | 'all', number>;
}

const statusLabels: Record<AnimeStatus | 'all', string> = {
  all: 'Todos',
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Abandonado',
  not_started: 'Planejado',
};

const statuses: (AnimeStatus | 'all')[] = ['all', 'watching', 'completed', 'paused', 'dropped', 'not_started'];

/**
 * Filtro de status para animes
 * Scrollável horizontalmente em mobile
 */
export function StatusFilter({ activeStatus, onChange, counts }: StatusFilterProps) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      <div className="flex gap-1.5 md:gap-2 min-w-max md:min-w-0 md:flex-wrap">
        {statuses.map((status) => (
          <Button
            key={status}
            variant={activeStatus === status ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(status)}
            className={cn(
              "rounded-full transition-all h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm touch-manipulation",
              activeStatus === status && "glow-primary"
            )}
          >
            {statusLabels[status]}
            <span className={cn(
              "ml-1.5 md:ml-2 px-1 md:px-1.5 py-0.5 text-[10px] md:text-xs rounded-full",
              activeStatus === status 
                ? "bg-primary-foreground/20" 
                : "bg-secondary"
            )}>
              {counts[status] || 0}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
