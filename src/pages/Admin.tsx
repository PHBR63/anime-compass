import { Shield, LayoutDashboard, Users, FileText, AlertTriangle, FlaskConical, Database, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminStats } from "@/components/admin/AdminStats";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { ErrorLogs } from "@/components/admin/ErrorLogs";
import { SystemTests } from "@/components/admin/SystemTests";
import { AnimeCatalogManager } from "@/components/admin/AnimeCatalogManager";
import { FreeApiStatus } from "@/components/admin/FreeApiStatus";
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
      className="container mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários, visualize logs e monitore o sistema
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <AdminStats />

      {/* Tabs de conteúdo */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-1 sm:grid-cols-7 lg:w-auto lg:inline-flex h-auto p-1">
          <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="freeapi" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">FreeAPI</span>
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Auditoria</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Erros</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Sistema</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AuditLogs />
            <ErrorLogs />
          </div>
        </TabsContent>

        <TabsContent value="freeapi" className="mt-6">
          <FreeApiStatus />
        </TabsContent>

        <TabsContent value="catalog" className="mt-6">
          <AnimeCatalogManager />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogs />
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <ErrorLogs />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemTests />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
