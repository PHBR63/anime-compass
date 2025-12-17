import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ListCard } from './ListCard';
import { CreateListModal } from './CreateListModal';
import { ListDetailView } from './ListDetailView';
import { useCustomLists } from '@/hooks/useCustomLists';
import type { CustomList } from '@/hooks/useCustomLists';

/**
 * Seção de listas personalizadas na página MyList
 */
export function ListsSection() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedList, setSelectedList] = useState<CustomList | null>(null);

  const { data: lists, isLoading } = useCustomLists();

  // Abrir automaticamente uma lista quando vier de outra tela (ex: card do chat)
  useEffect(() => {
    const openListId = (location.state as any)?.openListId as string | undefined;
    if (!openListId) return;
    if (!lists?.length) return;
    if (selectedList) return;

    const found = lists.find(l => l.id === openListId);
    if (found) {
      setSelectedList(found);
    }

    // Limpa o state para não reabrir em refresh/navegações futuras
    navigate(location.pathname, { replace: true, state: {} });
  }, [lists, selectedList, location.state, location.pathname, navigate]);


  // Se uma lista está selecionada, mostrar a view de detalhes
  if (selectedList) {
    return (
      <ListDetailView 
        list={selectedList} 
        onBack={() => setSelectedList(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Minhas Listas</h2>
          <p className="text-sm text-muted-foreground">
            Organize seus animes em listas personalizadas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Lista
        </Button>
      </div>

      {/* Grid/Carrossel de listas */}
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="min-w-[200px] aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : lists && lists.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {lists.map((list) => (
              <div key={list.id} className="min-w-[200px] max-w-[200px]">
                <ListCard 
                  list={list} 
                  onClick={() => setSelectedList(list)}
                />
              </div>
            ))}
            
            {/* Card para criar nova lista */}
            <div 
              className="min-w-[200px] aspect-[4/3] rounded-xl border-2 border-dashed border-border/50 
                         flex flex-col items-center justify-center gap-2 cursor-pointer
                         hover:border-primary/50 hover:bg-secondary/30 transition-colors"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nova Lista</span>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="glass-card p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Você ainda não tem listas personalizadas
          </p>
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Lista
          </Button>
        </div>
      )}

      {/* Modal de criação */}
      <CreateListModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
    </div>
  );
}
