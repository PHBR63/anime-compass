import { useState, useEffect } from 'react';
import { Globe, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateList } from '@/hooks/useCustomLists';
import type { CustomList } from '@/hooks/useCustomLists';

interface EditListModalProps {
  list: CustomList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal para editar uma lista personalizada existente
 */
export function EditListModal({ list, open, onOpenChange }: EditListModalProps) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || '');
  const [isPublic, setIsPublic] = useState(list.is_public);

  const updateList = useUpdateList();

  // Atualizar estados quando a lista mudar
  useEffect(() => {
    if (open) {
      setName(list.name);
      setDescription(list.description || '');
      setIsPublic(list.is_public);
    }
  }, [list, open]);

  // Handler para salvar alterações
  const handleSave = () => {
    if (!name.trim()) return;

    updateList.mutate(
      {
        id: list.id,
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Modal responsiva com largura adaptável */}
      <DialogContent className="w-[95vw] max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 flex-shrink-0">
          <DialogTitle>Editar Lista</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome da Lista *</Label>
            <Input
              id="edit-name"
              placeholder="Ex: Melhores de 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              placeholder="Uma breve descrição da lista..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="h-4 w-4 text-green-500" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="edit-public" className="cursor-pointer">
                  {isPublic ? 'Lista Pública' : 'Lista Privada'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic 
                    ? 'Qualquer pessoa pode ver' 
                    : 'Apenas você pode ver'
                  }
                </p>
              </div>
            </div>
            <Switch
              id="edit-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        {/* Footer fixo com botões */}
        <div className="flex justify-end gap-2 p-4 sm:p-6 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || updateList.isPending}
          >
            {updateList.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
