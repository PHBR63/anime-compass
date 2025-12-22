import { 
  Users, 
  Film, 
  MessageSquare, 
  Heart, 
  List, 
  Activity,
  FileText,
  AlertTriangle,
  UserPlus,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/useAdmin";

/**
 * Componente de cards de estatísticas do painel admin
 */
export function AdminStats() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Usuários",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Novos Hoje",
      value: stats?.newUsersToday || 0,
      icon: UserPlus,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Novos (7 dias)",
      value: stats?.newUsersWeek || 0,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Animes",
      value: stats?.totalAnimes || 0,
      icon: Film,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Reviews",
      value: stats?.totalReviews || 0,
      icon: MessageSquare,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Amizades",
      value: stats?.totalFriendships || 0,
      icon: Heart,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "Listas Criadas",
      value: stats?.totalLists || 0,
      icon: List,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      title: "Ativos (7 dias)",
      value: stats?.activeUsersWeek || 0,
      icon: Activity,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Logs Auditoria",
      value: stats?.totalAuditLogs || 0,
      icon: FileText,
      color: "text-slate-500",
      bgColor: "bg-slate-500/10",
    },
    {
      title: "Logs de Erros",
      value: stats?.totalErrorLogs || 0,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="glass-card hover:border-primary/30 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
