import { useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, User, Clock, Globe, Eye, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErrorLogs, ErrorLog } from "@/hooks/useAdmin";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Componente para exibição de logs de erros
 */
export function ErrorLogs() {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useErrorLogs(page, pageSize);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Logs de Erros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Logs de Erros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info */}
        <p className="text-sm text-muted-foreground">
          Total: {data?.total || 0} erros registrados
        </p>

        {/* Tabela de logs */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="min-w-[300px]">Mensagem</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs?.map((log: ErrorLog) => (
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
                          "Anônimo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <p className="text-sm text-destructive truncate font-medium">
                        {log.error_message}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.url ? (
                      <div className="flex items-center gap-2 text-sm max-w-[200px]">
                        <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-muted-foreground">
                          {new URL(log.url).pathname}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Detalhes do Erro
                          </DialogTitle>
                          <DialogDescription>
                            {format(new Date(log.created_at), "PPpp", {
                              locale: ptBR,
                            })}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Tabs defaultValue="message" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="message">Mensagem</TabsTrigger>
                            <TabsTrigger value="stack">Stack Trace</TabsTrigger>
                            <TabsTrigger value="context">Contexto</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="message" className="space-y-4">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Mensagem de Erro</p>
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                  <p className="text-sm font-medium text-destructive">
                                    {log.error_message}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Usuário</p>
                                  <p className="text-sm">
                                    {log.user_profile?.display_name ||
                                      log.user_profile?.username ||
                                      "Anônimo"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">URL</p>
                                  <p className="text-sm font-mono truncate">
                                    {log.url || "-"}
                                  </p>
                                </div>
                              </div>
                              
                              {log.user_agent && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">User Agent</p>
                                  <p className="text-xs font-mono text-muted-foreground">
                                    {log.user_agent}
                                  </p>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="stack">
                            {log.error_stack ? (
                              <ScrollArea className="h-64 rounded-lg border border-border bg-muted/50 p-3">
                                <pre className="text-xs font-mono whitespace-pre-wrap text-destructive/80">
                                  {log.error_stack}
                                </pre>
                              </ScrollArea>
                            ) : (
                              <div className="flex items-center justify-center h-32 text-muted-foreground">
                                <Code className="h-5 w-5 mr-2" />
                                Nenhum stack trace disponível
                              </div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="context">
                            {log.error_context ? (
                              <ScrollArea className="h-64 rounded-lg border border-border bg-muted/50 p-3">
                                <pre className="text-xs font-mono">
                                  {JSON.stringify(log.error_context, null, 2)}
                                </pre>
                              </ScrollArea>
                            ) : (
                              <div className="flex items-center justify-center h-32 text-muted-foreground">
                                Nenhum contexto adicional
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {data?.logs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum erro registrado
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
