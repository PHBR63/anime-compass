import { useState } from "react";
import { FileText, ChevronLeft, ChevronRight, User, Clock, Database, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuditLogs, AuditLog } from "@/hooks/useAdmin";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Componente para exibição de logs de auditoria
 */
export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const pageSize = 15;

  const { data, isLoading } = useAuditLogs(page, pageSize, actionFilter);

  /**
   * Retorna a cor do badge baseado na ação
   */
  const getActionBadge = (action: string) => {
    if (action.includes("ASSIGNED") || action.includes("INSERT")) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">{action}</Badge>;
    }
    if (action.includes("REMOVED") || action.includes("DELETE")) {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">{action}</Badge>;
    }
    if (action.includes("CHANGED") || action.includes("UPDATE")) {
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{action}</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground">{action}</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-96 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Logs de Auditoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="ROLE_ASSIGNED">Role Atribuído</SelectItem>
              <SelectItem value="ROLE_CHANGED">Role Alterado</SelectItem>
              <SelectItem value="ROLE_REMOVED">Role Removido</SelectItem>
              <SelectItem value="PROFILE_DELETED">Perfil Deletado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Total: {data?.total || 0} registros
          </p>
        </div>

        {/* Tabela de logs */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs?.map((log: AuditLog) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {log.user_profile?.display_name ||
                          log.user_profile?.username ||
                          "Sistema"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      {log.table_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.record_id ? log.record_id.slice(0, 8) + "..." : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detalhes do Log</DialogTitle>
                          <DialogDescription>
                            {log.action} em {log.table_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">ID</p>
                              <p className="font-mono">{log.id}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Record ID</p>
                              <p className="font-mono">{log.record_id || "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Data/Hora</p>
                              <p>
                                {format(new Date(log.created_at), "PPpp", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Usuário</p>
                              <p>
                                {log.user_profile?.display_name ||
                                  log.user_profile?.username ||
                                  "Sistema"}
                              </p>
                            </div>
                          </div>

                          {log.old_data && (
                            <div>
                              <p className="text-sm font-medium mb-2">Dados Anteriores</p>
                              <ScrollArea className="h-32 rounded-lg border border-border bg-muted/50 p-3">
                                <pre className="text-xs font-mono">
                                  {JSON.stringify(log.old_data, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                          )}

                          {log.new_data && (
                            <div>
                              <p className="text-sm font-medium mb-2">Dados Novos</p>
                              <ScrollArea className="h-32 rounded-lg border border-border bg-muted/50 p-3">
                                <pre className="text-xs font-mono">
                                  {JSON.stringify(log.new_data, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {data?.logs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {(data?.totalPages || 0) > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {data?.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data?.totalPages || 1, p + 1))}
                disabled={page >= (data?.totalPages || 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
