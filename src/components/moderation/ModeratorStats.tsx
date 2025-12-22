import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield,
  TrendingUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useModeratorStats } from "@/hooks/useModeration";

/**
 * Card de estatística individual
 */
function StatCard({ 
  icon, 
  label, 
  value, 
  color, 
  delay 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string; 
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Componente de estatísticas do moderador
 */
export function ModeratorStats() {
  const { data: stats, isLoading } = useModeratorStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Clock className="w-5 h-5 text-amber-500" />}
        label="Denúncias Pendentes"
        value={stats.pendingReports}
        color="bg-amber-500/10"
        delay={0}
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5 text-green-500" />}
        label="Resolvidas Hoje"
        value={stats.resolvedToday}
        color="bg-green-500/10"
        delay={0.1}
      />
      <StatCard
        icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
        label="Resolvidas Esta Semana"
        value={stats.resolvedThisWeek}
        color="bg-blue-500/10"
        delay={0.2}
      />
      <StatCard
        icon={<Shield className="w-5 h-5 text-primary" />}
        label="Suas Ações Totais"
        value={stats.totalActions}
        color="bg-primary/10"
        delay={0.3}
      />
    </div>
  );
}
