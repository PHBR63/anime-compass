import { motion } from "framer-motion";
import { 
  History, 
  EyeOff, 
  Eye, 
  AlertTriangle, 
  Ban,
  CheckCircle,
  XCircle,
  UserX,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useModerationLogs, ModerationAction } from "@/hooks/useModeration";
import { formatRelativeTime } from '@/lib/dateUtils';

/**
 * Mapeia ações para ícones e cores
 */
function getActionDisplay(action: ModerationAction) {
  const displays: Record<ModerationAction, { icon: React.ReactNode; label: string; color: string }> = {
    hide_review: { 
      icon: <EyeOff className="w-4 h-4" />, 
      label: "Ocultou review", 
      color: "bg-amber-500/10 text-amber-500 border-amber-500/30" 
    },
    unhide_review: { 
      icon: <Eye className="w-4 h-4" />, 
      label: "Restaurou review", 
      color: "bg-green-500/10 text-green-500 border-green-500/30" 
    },
    mark_spoiler: { 
      icon: <AlertTriangle className="w-4 h-4" />, 
      label: "Marcou spoiler", 
      color: "bg-purple-500/10 text-purple-500 border-purple-500/30" 
    },
    warn_user: { 
      icon: <AlertTriangle className="w-4 h-4" />, 
      label: "Avisou usuário", 
      color: "bg-orange-500/10 text-orange-500 border-orange-500/30" 
    },
    temp_ban: { 
      icon: <Ban className="w-4 h-4" />, 
      label: "Baniu temporariamente", 
      color: "bg-red-500/10 text-red-500 border-red-500/30" 
    },
    unban: { 
      icon: <User className="w-4 h-4" />, 
      label: "Removeu ban", 
      color: "bg-green-500/10 text-green-500 border-green-500/30" 
    },
    resolve_report: { 
      icon: <CheckCircle className="w-4 h-4" />, 
      label: "Resolveu denúncia", 
      color: "bg-green-500/10 text-green-500 border-green-500/30" 
    },
    dismiss_report: { 
      icon: <XCircle className="w-4 h-4" />, 
      label: "Dispensou denúncia", 
      color: "bg-muted text-muted-foreground" 
    },
  };

  return displays[action] || { 
    icon: <History className="w-4 h-4" />, 
    label: action, 
    color: "bg-muted text-muted-foreground" 
  };
}

/**
 * Componente de logs de moderação
 */
export function ModerationLogs() {
  const { data: logs, isLoading } = useModerationLogs(50);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico de Moderação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Histórico de Moderação
          {logs && logs.length > 0 && (
            <Badge variant="secondary">{logs.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma ação de moderação registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, index) => {
              const display = getActionDisplay(log.action);
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Ícone da ação */}
                  <div className={`p-2 rounded-full ${display.color}`}>
                    {display.icon}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={display.color}>
                        {display.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>

                    {log.reason && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {log.reason}
                      </p>
                    )}

                    {/* Moderador */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Por:</span>
                      <span className="font-medium text-foreground">
                        {log.moderator?.display_name || log.moderator?.username || 'Moderador'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
