import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare,
  User,
  Star,
  Filter,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useReports, 
  useResolveReport, 
  Report, 
  ReportStatus 
} from "@/hooks/useModeration";
import { formatRelativeTime } from '@/lib/dateUtils';

/**
 * Mapeia razões de denúncia para texto em português
 */
const reasonLabels: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Conteúdo Inapropriado",
  spoiler: "Spoiler não marcado",
  harassment: "Assédio/Bullying",
  other: "Outro",
};

/**
 * Mapeia tipos de conteúdo para texto em português
 */
const contentTypeLabels: Record<string, string> = {
  review: "Review",
  chat_message: "Mensagem de Chat",
  profile: "Perfil",
  anime_entry: "Entrada de Anime",
};

/**
 * Retorna cor do badge baseado no status
 */
function getStatusBadge(status: ReportStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    case 'resolved':
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Resolvida</Badge>;
    case 'dismissed':
      return <Badge variant="outline" className="bg-muted text-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Dispensada</Badge>;
  }
}

/**
 * Componente de card de denúncia individual
 */
function ReportCard({ report, onAction }: { report: Report; onAction: (action: 'resolve' | 'dismiss') => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border border-border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Informações da denúncia */}
        <div className="flex-1 space-y-3">
          {/* Header com tipo e razão */}
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(report.status)}
            <Badge variant="secondary">
              {contentTypeLabels[report.content_type] || report.content_type}
            </Badge>
            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {reasonLabels[report.reason] || report.reason}
            </Badge>
          </div>

          {/* Descrição */}
          {report.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.description}
            </p>
          )}

          {/* Usuários envolvidos */}
          <div className="flex items-center gap-4 text-sm">
            {/* Denunciante */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Por:</span>
              <Avatar className="w-5 h-5">
                <AvatarImage src={report.reporter?.avatar_url || ''} />
                <AvatarFallback className="text-[10px]">
                  {report.reporter?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {report.reporter?.display_name || report.reporter?.username || 'Usuário'}
              </span>
            </div>

            {/* Denunciado */}
            {report.reported_user && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Contra:</span>
                <Avatar className="w-5 h-5">
                  <AvatarImage src={report.reported_user?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {report.reported_user?.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {report.reported_user?.display_name || report.reported_user?.username || 'Usuário'}
                </span>
              </div>
            )}
          </div>

          {/* Data */}
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(report.created_at)}
          </p>
        </div>

        {/* Ações */}
        {report.status === 'pending' && (
          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              variant="default"
              onClick={() => onAction('resolve')}
              className="gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Resolver
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction('dismiss')}
              className="gap-1"
            >
              <XCircle className="w-4 h-4" />
              Dispensar
            </Button>
          </div>
        )}
      </div>

      {/* Nota de resolução */}
      {report.resolution_note && report.status !== 'pending' && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Nota:</span> {report.resolution_note}
          </p>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Componente principal de lista de denúncias
 */
export function ReportsList() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'dismiss' | null>(null);
  const [note, setNote] = useState('');

  const { data: reports, isLoading } = useReports(
    statusFilter === 'all' ? undefined : statusFilter
  );
  const resolveReport = useResolveReport();

  // Handler para abrir modal de ação
  const handleAction = (report: Report, action: 'resolve' | 'dismiss') => {
    setSelectedReport(report);
    setActionType(action);
    setNote('');
  };

  // Handler para confirmar ação
  const handleConfirmAction = () => {
    if (!selectedReport || !actionType) return;

    resolveReport.mutate({
      reportId: selectedReport.id,
      status: actionType === 'resolve' ? 'resolved' : 'dismissed',
      note: note || undefined,
    }, {
      onSuccess: () => {
        setSelectedReport(null);
        setActionType(null);
        setNote('');
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Denúncias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Denúncias
            {reports && reports.length > 0 && (
              <Badge variant="secondary">{reports.length}</Badge>
            )}
          </CardTitle>

          {/* Filtro de status */}
          <Select 
            value={statusFilter} 
            onValueChange={(v) => setStatusFilter(v as ReportStatus | 'all')}
          >
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="resolved">Resolvidas</SelectItem>
              <SelectItem value="dismissed">Dispensadas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma denúncia {statusFilter !== 'all' ? statusFilter : ''} encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {reports.map((report) => (
                  <ReportCard 
                    key={report.id} 
                    report={report} 
                    onAction={(action) => handleAction(report, action)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmação */}
      <Dialog open={!!selectedReport && !!actionType} onOpenChange={() => {
        setSelectedReport(null);
        setActionType(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'resolve' ? 'Resolver Denúncia' : 'Dispensar Denúncia'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'resolve' 
                ? 'Confirme que a denúncia foi investigada e uma ação foi tomada.' 
                : 'Confirme que a denúncia não procede ou já foi tratada.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nota (opcional)</label>
              <Textarea
                placeholder="Adicione uma nota sobre a resolução..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedReport(null);
              setActionType(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmAction}
              disabled={resolveReport.isPending}
              variant={actionType === 'resolve' ? 'default' : 'secondary'}
            >
              {resolveReport.isPending ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
