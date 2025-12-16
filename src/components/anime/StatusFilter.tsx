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

export function StatusFilter({ activeStatus, onChange, counts }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <Button
          key={status}
          variant={activeStatus === status ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(status)}
          className={cn(
            "rounded-full transition-all",
            activeStatus === status && "glow-primary"
          )}
        >
          {statusLabels[status]}
          <span className={cn(
            "ml-2 px-1.5 py-0.5 text-xs rounded-full",
            activeStatus === status 
              ? "bg-primary-foreground/20" 
              : "bg-secondary"
          )}>
            {counts[status] || 0}
          </span>
        </Button>
      ))}
    </div>
  );
}
