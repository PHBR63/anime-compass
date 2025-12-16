import { ArrowLeft, Globe, Lock, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { useListItems, useRemoveFromList } from '@/hooks/useCustomLists';
import type { CustomList } from '@/hooks/useCustomLists';
import { cn } from '@/lib/utils';

interface ListDetailViewProps {
  list: CustomList;
  onBack: () => void;
}

/**
 * Visualização detalhada de uma lista personalizada
 */
export function ListDetailView({ list, onBack }: ListDetailViewProps) {
  const { data: items, isLoading } = useListItems(list.id);
  const removeFromList = useRemoveFromList();

  // Extrair os anime_entries dos items
  const entries = items?.map((item: any) => item.anime_entry).filter(Boolean) || [];

  // Pegar imagens para o banner
  const bannerImages = entries.slice(0, 3).map((e: any) => e.image_url);

  return (
    <div className="space-y-6">
      {/* Header com banner */}
      <div className="relative">
        {/* Banner com blur */}
        <div className="absolute inset-0 h-40 overflow-hidden rounded-xl">
          {bannerImages.length > 0 ? (
            <div className="flex w-full h-full">
              {bannerImages.map((url: string, index: number) => (
                <div key={index} className="flex-1 relative overflow-hidden">
                  <img
                    src={url || '/placeholder.svg'}
                    alt=""
                    className="w-full h-full object-cover blur-sm scale-110"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        {/* Conteúdo do header */}
        <div className="relative pt-4 pb-2 px-4">
          {/* Botão voltar */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {/* Info da lista */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">
                  {list.name}
                </h1>
                <Badge 
                  variant="outline" 
                  className={cn(
                    list.is_public 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : ""
                  )}
                >
                  {list.is_public ? (
                    <><Globe className="h-3 w-3 mr-1" /> Pública</>
                  ) : (
                    <><Lock className="h-3 w-3 mr-1" /> Privada</>
                  )}
                </Badge>
              </div>
              
              {list.description && (
                <p className="text-muted-foreground max-w-xl">
                  {list.description}
                </p>
              )}
              
              <p className="text-sm text-muted-foreground">
                {entries.length} anime{entries.length !== 1 && 's'}
              </p>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de animes */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : entries.length > 0 ? (
        <AnimeGrid entries={entries} />
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Esta lista está vazia
          </p>
          <p className="text-sm text-muted-foreground">
            Use a edição em massa para adicionar animes a esta lista
          </p>
        </div>
      )}
    </div>
  );
}
