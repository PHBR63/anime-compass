import { motion } from "framer-motion";
import { Shield, AlertTriangle, History, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModeratorStats } from "@/components/moderation/ModeratorStats";
import { ReportsList } from "@/components/moderation/ReportsList";
import { ModerationLogs } from "@/components/moderation/ModerationLogs";
import { usePendingReportsCount } from "@/hooks/useModeration";
import { Badge } from "@/components/ui/badge";

/**
 * Página do painel de moderação
 * Acessível apenas para moderadores e admins
 */
export default function Moderation() {
  const { data: pendingCount } = usePendingReportsCount();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto px-4 py-6 max-w-6xl"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Painel de Moderação</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie denúncias, modere conteúdo e mantenha a comunidade segura.
        </p>
      </div>

      {/* Estatísticas */}
      <div className="mb-8">
        <ModeratorStats />
      </div>

      {/* Tabs de conteúdo */}
      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Denúncias
            {pendingCount && pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsList />
        </TabsContent>

        <TabsContent value="logs">
          <ModerationLogs />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
