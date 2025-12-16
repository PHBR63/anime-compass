import { useState } from 'react';
import { Sparkles, Lock, Globe } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartListBuilder } from './SmartListBuilder';
import { useCreateList } from '@/hooks/useCustomLists';

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal para criar uma nova lista personalizada (manual ou inteligente)
 */
export function CreateListModal({ open, onOpenChange }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'smart'>('manual');

  const createList = useCreateList();

  // Handler para criar lista manual
  const handleCreateManual = () => {
    if (!name.trim()) return;

    createList.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  // Resetar formulário
  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPublic(false);
    setActiveTab('manual');
  };

  // Handler para fechar modal
  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Lista</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'smart')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="smart" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Inteligente
            </TabsTrigger>
          </TabsList>

          {/* Criação Manual */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Lista *</Label>
              <Input
                id="name"
                placeholder="Ex: Melhores de 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
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
                  <Label htmlFor="public-toggle" className="cursor-pointer">
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
                id="public-toggle"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateManual} 
                disabled={!name.trim() || createList.isPending}
              >
                {createList.isPending ? 'Criando...' : 'Criar Lista'}
              </Button>
            </div>
          </TabsContent>

          {/* Criação Inteligente */}
          <TabsContent value="smart" className="mt-4">
            <SmartListBuilder 
              onSuccess={() => {
                resetForm();
                onOpenChange(false);
              }}
              onCancel={() => handleClose(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
