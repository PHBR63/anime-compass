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
import { ScrollArea } from '@/components/ui/scroll-area';
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
      {/* Modal responsiva com largura e altura adaptáveis */}
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl h-[85vh] max-h-[700px] flex flex-col p-0 gap-0 animate-scale-in">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle>Criar Nova Lista</DialogTitle>
        </DialogHeader>

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'manual' | 'smart')}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 sm:px-6 pt-2 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="smart" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Inteligente
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Criação Manual */}
          <TabsContent value="manual" className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-4 m-0 data-[state=inactive]:hidden">
            <ScrollArea className="flex-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="space-y-4 pb-4">
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
              </div>
            </ScrollArea>

            {/* Footer fixo para aba manual */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border/50 flex-shrink-0">
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
          <TabsContent value="smart" className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-4 m-0 data-[state=inactive]:hidden">
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
