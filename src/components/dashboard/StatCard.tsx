import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

/**
 * Card de estatística do dashboard
 * Otimizado para diferentes tamanhos de tela
 */
export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("stat-card animate-fade-in p-4 md:p-6", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs md:text-sm text-muted-foreground">{label}</span>
        <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
        </div>
      </div>
      
      <div className="flex items-end justify-between mt-1.5 md:mt-2">
        <span className="stat-value text-xl md:text-3xl">{value}</span>
        
        {trend && (
          <span className={cn(
            "text-xs md:text-sm font-medium",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}
