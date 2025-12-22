import { useState } from "react";
import { 
  MoreHorizontal, 
  EyeOff, 
  Eye, 
  AlertTriangle, 
  Ban,
  UserX,
  Flag,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  useToggleReviewVisibility, 
  useWarnUser, 
  useTempBanUser,
  useIsModerator 
} from "@/hooks/useModeration";
import { ReportContentModal } from "./ReportContentModal";

interface ModerationActionsMenuProps {
  type: 'review' | 'user';
  targetId: string;
  userId?: string; // ID do autor (para reviews)
  isHidden?: boolean; // Se a review está oculta
  showReportOption?: boolean; // Mostrar opção de denunciar
}

/**
 * Menu de ações de moderação
 */
export function ModerationActionsMenu({ 
  type, 
  targetId, 
  userId,
  isHidden = false,
  showReportOption = true
}: ModerationActionsMenuProps) {
  const { data: isModerator } = useIsModerator();
  const [actionModal, setActionModal] = useState<'hide' | 'warn' | 'ban' | null>(null);
  const [reason, setReason] = useState('');
  const [banDays, setBanDays] = useState(7);

  const toggleVisibility = useToggleReviewVisibility();
  const warnUser = useWarnUser();
  const tempBan = useTempBanUser();

  // Se não for moderador e não tiver opção de denunciar, não exibe nada
  if (!isModerator && !showReportOption) return null;

  // Handler para confirmar ação
  const handleConfirmAction = () => {
    switch (actionModal) {
      case 'hide':
        if (type === 'review') {
          toggleVisibility.mutate({ 
            reviewId: targetId, 
            hide: !isHidden, 
            reason 
          }, {
            onSuccess: () => {
              setActionModal(null);
              setReason('');
            }
          });
        }
        break;
      case 'warn':
        if (userId) {
          warnUser.mutate({ userId, reason }, {
            onSuccess: () => {
              setActionModal(null);
              setReason('');
            }
          });
        }
        break;
      case 'ban':
        if (userId) {
          tempBan.mutate({ userId, days: banDays, reason }, {
            onSuccess: () => {
              setActionModal(null);
              setReason('');
              setBanDays(7);
            }
          });
        }
        break;
    }
  };

  const isPending = toggleVisibility.isPending || warnUser.isPending || tempBan.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {/* Opção de denunciar (disponível para todos) */}
          {showReportOption && (
            <>
              <ReportContentModal
                contentType={type === 'user' ? 'profile' : type}
                contentId={targetId}
                reportedUserId={userId}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Flag className="w-4 h-4 mr-2" />
                    Denunciar
                  </DropdownMenuItem>
                }
              />
              {isModerator && <DropdownMenuSeparator />}
            </>
          )}

          {/* Ações de moderação (apenas para moderadores) */}
          {isModerator && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-primary">
                <Shield className="w-4 h-4" />
                Moderação
              </DropdownMenuLabel>

              {type === 'review' && (
                <DropdownMenuItem onClick={() => setActionModal('hide')}>
                  {isHidden ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Restaurar Review
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Ocultar Review
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {userId && (
                <>
                  <DropdownMenuItem onClick={() => setActionModal('warn')}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                    Avisar Usuário
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActionModal('ban')}
                    className="text-destructive"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Banir Temporariamente
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de confirmação */}
      <Dialog open={!!actionModal} onOpenChange={() => {
        setActionModal(null);
        setReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal === 'hide' && (isHidden ? 'Restaurar Review' : 'Ocultar Review')}
              {actionModal === 'warn' && 'Avisar Usuário'}
              {actionModal === 'ban' && 'Banir Temporariamente'}
            </DialogTitle>
            <DialogDescription>
              {actionModal === 'hide' && (
                isHidden 
                  ? 'A review voltará a ser visível para todos os usuários.' 
                  : 'A review será ocultada e não aparecerá mais para os usuários.'
              )}
              {actionModal === 'warn' && 'O usuário receberá um aviso formal. Múltiplos avisos podem resultar em ban.'}
              {actionModal === 'ban' && 'O usuário será impedido de realizar ações durante o período especificado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionModal === 'ban' && (
              <div>
                <Label htmlFor="banDays">Duração do Ban (dias)</Label>
                <Input
                  id="banDays"
                  type="number"
                  min={1}
                  max={365}
                  value={banDays}
                  onChange={(e) => setBanDays(parseInt(e.target.value) || 7)}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="reason">Motivo {actionModal !== 'hide' && '*'}</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo da ação..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmAction}
              disabled={isPending || (actionModal !== 'hide' && !reason)}
              variant={actionModal === 'ban' ? 'destructive' : 'default'}
            >
              {isPending ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
