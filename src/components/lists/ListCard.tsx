import { useState } from 'react';
import { Globe, Lock, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteList, useListItems } from '@/hooks/useCustomLists';
import type { CustomList } from '@/hooks/useCustomLists';
import { cn } from '@/lib/utils';

interface ListCardProps {
  list: CustomList;
  onClick?: () => void;
}

/**
 * Card visual de uma lista personalizada
 */
export function ListCard({ list, onClick }: ListCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const deleteList = useDeleteList();
  const { data: items } = useListItems(list.id);

  // Pegar imagens dos primeiros 4 animes para collage
  const coverImages = items?.slice(0, 4).map((item: any) => item.anime_entry?.image_url) || [];
  const itemCount = items?.length ?? 0;

  const handleDelete = () => {
    deleteList.mutate(list.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    });
  };

  return (
    <>
      <Card 
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-300",
          "hover:shadow-lg hover:shadow-primary/10 hover:border-border"
        )}
        onClick={onClick}
      >
        {/* Capa - Collage ou Placeholder */}
        <div className="aspect-video relative overflow-hidden bg-secondary/50">
          {coverImages.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
              {coverImages.map((url: string, index: number) => (
                <div key={index} className="relative overflow-hidden">
                  <img
                    src={url || '/placeholder.svg'}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              ))}
              {/* Preencher espaços vazios */}
              {[...Array(Math.max(0, 4 - coverImages.length))].map((_, index) => (
                <div 
                  key={`empty-${index}`} 
                  className="bg-secondary/80"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">📋</span>
            </div>
          )}

          {/* Gradiente overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          {/* Badge público/privado */}
          <Badge 
            variant="outline" 
            className={cn(
              "absolute top-2 left-2 text-xs",
              list.is_public 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-secondary/80 backdrop-blur-sm"
            )}
          >
            {list.is_public ? (
              <><Globe className="h-3 w-3 mr-1" /> Pública</>
            ) : (
              <><Lock className="h-3 w-3 mr-1" /> Privada</>
            )}
          </Badge>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1">
          <h3 className="font-semibold text-sm truncate">{list.name}</h3>
          {list.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {list.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {itemCount} anime{itemCount !== 1 && 's'}
          </p>
        </div>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a lista "{list.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
