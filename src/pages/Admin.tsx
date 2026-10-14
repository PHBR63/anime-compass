import { Shield, LayoutDashboard, Users, FileText, AlertTriangle, FlaskConical, Download, HardDrive, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminStats } from "@/components/admin/AdminStats";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { ErrorLogs } from "@/components/admin/ErrorLogs";
import { SystemTests } from "@/components/admin/SystemTests";
import { CatalogImportManager } from "@/components/admin/CatalogImportManager";
import { JikanImportManager } from "@/components/admin/JikanImportManager";
import { CatalogImageSync } from "@/components/admin/CatalogImageSync";
import { CatalogOverview } from "@/components/admin/CatalogOverview";
import { motion } from "framer-motion";

/**
 * Página do painel administrativo
 * Apenas acessível por usuários com role 'admin'
 */
export default function Admin() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto px-3 py-4 sm:p-6 space-y-4 sm:space-y-6"
    >
      {/* Header responsivo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie usuários, logs e catálogo
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <AdminStats />

      {/* Tabs com scroll horizontal em mobile */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none">
          <TabsList className="inline-flex w-max sm:w-auto h-auto p-1 gap-0.5 sm:gap-1">
            <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Importação
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <HardDrive className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Imagens
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Auditoria
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Sistema
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <AuditLogs />
            <ErrorLogs />
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-4 sm:mt-6 space-y-4 min-w-0">
          <JikanImportManager />
          <CatalogImportManager />
        </TabsContent>

        <TabsContent value="images" className="mt-4 sm:mt-6">
          <CatalogImageSync />
        </TabsContent>

        <TabsContent value="stats" className="mt-4 sm:mt-6">
          <CatalogOverview />
        </TabsContent>

        <TabsContent value="users" className="mt-4 sm:mt-6">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="audit" className="mt-4 sm:mt-6">
          <AuditLogs />
        </TabsContent>

        <TabsContent value="system" className="mt-4 sm:mt-6">
          <SystemTests />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
