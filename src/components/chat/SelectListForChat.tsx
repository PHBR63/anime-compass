import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Lock, List, Send } from 'lucide-react';
import { useCustomLists, useListItems } from '@/hooks/useCustomLists';
import { cn } from '@/lib/utils';

interface SelectListForChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (list: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    item_count: number;
    cover_images: string[];
    owner_id: string;
  }, message?: string) => void;
}

// Componente para selecionar uma lista para compartilhar no chat
export default function SelectListForChat({
  open,
  onOpenChange,
  onSelect,
}: SelectListForChatProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  
  const { data: lists, isLoading } = useCustomLists();
  const { data: listItems, isLoading: loadingItems } = useListItems(selectedListId);

  // Lista selecionada
  const selectedList = lists?.find(l => l.id === selectedListId);

  // Aguardar items carregarem quando uma lista é selecionada
  useEffect(() => {
    if (selectedListId && !loadingItems && listItems !== undefined) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [selectedListId, loadingItems, listItems]);

  // Buscar imagens de capa da lista (4 primeiros animes)
  const getCoverImages = () => {
    if (!listItems) return [];
    return listItems
      .slice(0, 4)
      .map(item => item.anime_entry?.image_url)
      .filter(Boolean) as string[];
  };

  // Handler para compartilhar
  const handleShare = () => {
    if (!selectedList || !isReady) return;
    
    const coverImages = getCoverImages();
    
    onSelect({
      id: selectedList.id,
      name: selectedList.name,
      description: selectedList.description,
      is_public: selectedList.is_public || false,
      item_count: listItems?.length || 0,
      cover_images: coverImages,
      owner_id: selectedList.user_id,
    }, customMessage.trim() || undefined);
    
    // Reset state
    setSelectedListId(null);
    setCustomMessage('');
    setIsReady(false);
    onOpenChange(false);
  };

  // Cancelar seleção
  const handleCancel = () => {
    setSelectedListId(null);
    setCustomMessage('');
    setIsReady(false);
    onOpenChange(false);
  };

  // Reset quando modal fecha
  useEffect(() => {
    if (!open) {
      setSelectedListId(null);
      setCustomMessage('');
      setIsReady(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Compartilhar Lista
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !lists?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Você ainda não tem listas criadas.</p>
          </div>
        ) : selectedListId ? (
          // Preview da lista selecionada
          <div className="space-y-4">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando lista...</span>
              </div>
            ) : (
              <>
                <ListPreviewCard
                  list={selectedList!}
                  coverImages={getCoverImages()}
                  itemCount={listItems?.length || 0}
                />
                
                <Input
                  placeholder="Adicionar mensagem (opcional)"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedListId(null)}>
                    Voltar
                  </Button>
                  <Button className="flex-1" onClick={handleShare} disabled={!isReady}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          // Lista de listas para escolher
          <ScrollArea className="max-h-[400px] pr-2">
            <div className="space-y-2">
              {lists.map(list => (
                <ListSelectItem
                  key={list.id}
                  list={list}
                  onClick={() => setSelectedListId(list.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {!selectedListId && lists?.length ? (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// Item de lista para seleção
function ListSelectItem({ 
  list, 
  onClick 
}: { 
  list: { id: string; name: string; description: string | null; is_public: boolean | null };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border border-border text-left',
        'hover:bg-accent/50 transition-colors',
        'flex items-center gap-3'
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <List className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{list.name}</span>
          {list.is_public ? (
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
        </div>
        {list.description && (
          <p className="text-xs text-muted-foreground truncate">{list.description}</p>
        )}
      </div>
    </button>
  );
}

// Card de preview da lista selecionada
function ListPreviewCard({
  list,
  coverImages,
  itemCount,
}: {
  list: { name: string; description: string | null; is_public: boolean | null };
  coverImages: string[];
  itemCount: number;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Collage de imagens */}
      <div className="aspect-video bg-muted relative">
        {coverImages.length > 0 ? (
          <div className="grid grid-cols-2 h-full">
            {coverImages.slice(0, 4).map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className="w-full h-full object-cover"
              />
            ))}
            {/* Preencher espaços vazios */}
            {Array.from({ length: Math.max(0, 4 - coverImages.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-muted" />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <List className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate">{list.name}</h4>
          <Badge variant="secondary" className="text-xs shrink-0">
            {list.is_public ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                Pública
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Privada
              </>
            )}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'anime' : 'animes'}
        </p>
        {list.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {list.description}
          </p>
        )}
      </div>
    </div>
  );
}
