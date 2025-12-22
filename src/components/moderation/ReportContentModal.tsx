import { useState } from "react";
import { Flag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateReport, ContentType, ReportReason } from "@/hooks/useModeration";

interface ReportContentModalProps {
  contentType: ContentType;
  contentId: string;
  reportedUserId?: string;
  trigger?: React.ReactNode;
}

/**
 * Razões de denúncia com descrições
 */
const reportReasons: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Conteúdo repetitivo ou promocional' },
  { value: 'inappropriate', label: 'Conteúdo Inapropriado', description: 'Conteúdo ofensivo ou explícito' },
  { value: 'spoiler', label: 'Spoiler não marcado', description: 'Revela partes importantes da história' },
  { value: 'harassment', label: 'Assédio/Bullying', description: 'Comportamento abusivo contra outros usuários' },
  { value: 'other', label: 'Outro', description: 'Outro motivo não listado' },
];

/**
 * Modal para denunciar conteúdo
 */
export function ReportContentModal({ 
  contentType, 
  contentId, 
  reportedUserId,
  trigger 
}: ReportContentModalProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  
  const createReport = useCreateReport();

  // Handler para enviar denúncia
  const handleSubmit = () => {
    if (!reason) return;

    createReport.mutate({
      content_type: contentType,
      content_id: contentId,
      reported_user_id: reportedUserId,
      reason,
      description: description || undefined,
    }, {
      onSuccess: () => {
        setOpen(false);
        setReason('');
        setDescription('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Flag className="w-4 h-4 mr-1" />
            Denunciar
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Denunciar Conteúdo
          </DialogTitle>
          <DialogDescription>
            Por favor, selecione o motivo da denúncia. Denúncias falsas podem resultar em penalidades.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Razões */}
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
            {reportReasons.map((item) => (
              <div key={item.value} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={item.value} id={item.value} className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={item.value} className="font-medium cursor-pointer">
                    {item.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {/* Descrição adicional */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Detalhes adicionais (opcional)
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva o problema em mais detalhes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!reason || createReport.isPending}
            variant="destructive"
          >
            {createReport.isPending ? 'Enviando...' : 'Enviar Denúncia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
