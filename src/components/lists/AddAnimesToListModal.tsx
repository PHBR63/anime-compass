import { useState, useMemo } from 'react';
import { Search, Plus, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useListItems, useAddToList } from '@/hooks/useCustomLists';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddAnimesToListModalProps {
  listId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal para adicionar animes a uma lista customizada
 */
export function AddAnimesToListModal({ listId, open, onOpenChange }: AddAnimesToListModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Buscar todos os animes do usuário
  const { data: allEntries, isLoading: loadingEntries } = useAnimeEntries();
  
  // Buscar itens já na lista
  const { data: listItems, isLoading: loadingItems } = useListItems(listId);
  
  const addToList = useAddToList();

  // IDs dos animes já na lista
  const existingIds = useMemo(() => {
    if (!listItems) return new Set<string>();
    return new Set(listItems.map((item: any) => item.anime_entry_id));
  }, [listItems]);

  // Animes disponíveis (não estão na lista)
  const availableEntries = useMemo(() => {
    if (!allEntries) return [];
    return allEntries.filter((entry: any) => !existingIds.has(entry.id));
  }, [allEntries, existingIds]);

  // Filtrar por busca
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return availableEntries;
    const searchLower = search.toLowerCase();
    return availableEntries.filter((entry: any) =>
      entry.title?.toLowerCase().includes(searchLower)
    );
  }, [availableEntries, search]);

  // Toggle seleção
  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Selecionar todos
  const selectAll = () => {
    setSelectedIds(filteredEntries.map((e: any) => e.id));
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Adicionar selecionados à lista
  const handleAdd = async () => {
    if (selectedIds.length === 0) return;

    setIsAdding(true);
    try {
      // Adicionar um por um para manter a ordem
      for (const animeEntryId of selectedIds) {
        await addToList.mutateAsync({ listId, animeEntryId });
      }
      
      toast.success(`${selectedIds.length} anime(s) adicionado(s) à lista`);
      setSelectedIds([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar animes:', error);
      toast.error('Erro ao adicionar animes');
    } finally {
      setIsAdding(false);
    }
  };

  const isLoading = loadingEntries || loadingItems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Animes à Lista</DialogTitle>
        </DialogHeader>

        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar animes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Ações de seleção */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {selectedIds.length} selecionado(s)
            </span>
            {selectedIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Limpar
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Selecionar todos ({filteredEntries.length})
          </Button>
        </div>

        {/* Lista de animes */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {availableEntries.length === 0 ? (
                <p>Todos os seus animes já estão nesta lista</p>
              ) : (
                <p>Nenhum anime encontrado</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry: any) => {
                const isSelected = selectedIds.includes(entry.id);
                return (
                  <div
                    key={entry.id}
                    onClick={() => toggleSelection(entry.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                      "hover:bg-secondary/50",
                      isSelected && "bg-primary/10 border border-primary/30"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(entry.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <img
                      src={entry.image_url || '/placeholder.svg'}
                      alt={entry.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {entry.status === 'watching' && 'Assistindo'}
                          {entry.status === 'completed' && 'Completo'}
                          {entry.status === 'paused' && 'Pausado'}
                          {entry.status === 'dropped' && 'Abandonado'}
                          {entry.status === 'planned' && 'Planejado'}
                        </Badge>
                        {entry.rating && (
                          <span className="text-xs text-muted-foreground">
                            ★ {entry.rating}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer com ações */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.length === 0 || isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
