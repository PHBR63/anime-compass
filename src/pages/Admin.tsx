import type { ReactNode } from "react";
import { Shield, LayoutDashboard, Users, FileText, FlaskConical, Download, HardDrive, BarChart3, Library, History, Languages, Archive, type LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminStats } from "@/components/admin/AdminStats";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { ErrorLogs } from "@/components/admin/ErrorLogs";
import { SystemTests } from "@/components/admin/SystemTests";
import { CatalogImportManager } from "@/components/admin/CatalogImportManager";
import { JikanImportManager } from "@/components/admin/JikanImportManager";
import { JikanImportHistory } from "@/components/admin/JikanImportHistory";
import { JikanImportAlerts } from "@/components/admin/JikanImportAlerts";
import { DeeplTranslationReview } from "@/components/admin/DeeplTranslationReview";
import { CatalogImageSync } from "@/components/admin/CatalogImageSync";
import { CatalogOverview } from "@/components/admin/CatalogOverview";
import { motion } from "framer-motion";

/** Lista de abas com rolagem horizontal em telas pequenas. */
function AbasRolaveis({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none">
      <TabsList className="inline-flex w-max sm:w-auto h-auto p-1 gap-0.5 sm:gap-1">{children}</TabsList>
    </div>
  );
}

/** Aba padronizada com ícone e texto compactos no celular. */
function Aba({ valor, icone: Icone, children }: { valor: string; icone: LucideIcon; children: ReactNode }) {
  return (
    <TabsTrigger value={valor} className="gap-1 sm:gap-2 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
      <Icone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
      {children}
    </TabsTrigger>
  );
}

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
            Catálogo, usuários e saúde do sistema
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <AdminStats />

      {/* Abas principais organizadas por tarefa; scroll horizontal no celular */}
      <Tabs defaultValue="overview" className="w-full">
        <AbasRolaveis>
          <Aba valor="overview" icone={LayoutDashboard}>Geral</Aba>
          <Aba valor="catalog" icone={Library}>Catálogo</Aba>
          <Aba valor="users" icone={Users}>Usuários</Aba>
          <Aba valor="audit" icone={FileText}>Auditoria</Aba>
          <Aba valor="system" icone={FlaskConical}>Sistema</Aba>
        </AbasRolaveis>

        <TabsContent value="overview" className="mt-4 sm:mt-6 space-y-4">
          {/* Aviso quando a importação automática do Jikan falha ou termina com erros */}
          <JikanImportAlerts />
          <ErrorLogs />
        </TabsContent>

        {/* Tudo do catálogo em um só lugar, separado por etapa */}
        <TabsContent value="catalog" className="mt-4 sm:mt-6 min-w-0">
          <Tabs defaultValue="import" className="w-full">
            <AbasRolaveis>
              <Aba valor="import" icone={Download}>Importar</Aba>
              <Aba valor="history" icone={History}>Histórico</Aba>
              <Aba valor="translations" icone={Languages}>Traduções</Aba>
              <Aba valor="images" icone={HardDrive}>Imagens</Aba>
              <Aba valor="stats" icone={BarChart3}>Números</Aba>
              <Aba valor="legacy" icone={Archive}>Importação antiga</Aba>
            </AbasRolaveis>
            <TabsContent value="import" className="mt-4 min-w-0"><JikanImportManager /></TabsContent>
            <TabsContent value="history" className="mt-4 min-w-0"><JikanImportHistory /></TabsContent>
            <TabsContent value="translations" className="mt-4 min-w-0"><DeeplTranslationReview /></TabsContent>
            <TabsContent value="images" className="mt-4 min-w-0"><CatalogImageSync /></TabsContent>
            <TabsContent value="stats" className="mt-4 min-w-0"><CatalogOverview /></TabsContent>
            <TabsContent value="legacy" className="mt-4 min-w-0"><CatalogImportManager /></TabsContent>
          </Tabs>
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
