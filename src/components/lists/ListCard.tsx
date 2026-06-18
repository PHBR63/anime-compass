import { useState, useEffect, useRef } from 'react';
import { Globe, Lock, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface ListCardProps {
  list: CustomList;
  onClick?: () => void;
}

/**
 * Card visual de uma lista personalizada
 * Exibe carrossel animado dos animes no hover
 */
export function ListCard({ list, onClick }: ListCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const deleteList = useDeleteList();
  const { data: items } = useListItems(list.id);

  // Pegar imagens dos primeiros 6 animes para o carrossel
  const allImages = items?.slice(0, 6).map((item: any) => ({
    url: item.anime_entry?.image_url,
    title: item.anime_entry?.title
  })).filter((img: any) => img.url) || [];
  
  // Imagens para a colagem (primeiros 4)
  const coverImages = allImages.slice(0, 4).map((img: any) => img.url);
  const itemCount = items?.length ?? 0;

  // Auto-avançar carrossel no hover
  useEffect(() => {
    if (isHovered && allImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % allImages.length);
      }, 2000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovered, allImages.length]);

  // Reset index quando sair do hover
  useEffect(() => {
    if (!isHovered) {
      setCurrentIndex(0);
    }
  }, [isHovered]);

  const handleDelete = () => {
    deleteList.mutate(list.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    });
  };

  // Navegar manualmente no carrossel
  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  return (
    <>
      <Card 
        className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-border"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Capa - Collage ou Carrossel no hover */}
        <div className="aspect-video relative overflow-hidden bg-secondary/50">
          <AnimatePresence mode="wait">
            {isHovered && allImages.length > 0 ? (
              // Carrossel animado no hover
              <motion.div
                key="carousel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentIndex}
                    src={allImages[currentIndex]?.url || '/placeholder.svg'}
                    alt={allImages[currentIndex]?.title || ''}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>

                {/* Título do anime atual */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background/90 to-transparent"
                >
                  <p className="text-xs font-medium truncate">
                    {allImages[currentIndex]?.title}
                  </p>
                </motion.div>

                {/* Navegação manual */}
                {allImages.length > 1 && (
                  <>
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={goToPrev}
                      className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={goToNext}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.button>
                  </>
                )}

                {/* Indicadores de posição */}
                {allImages.length > 1 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {allImages.map((_, index) => (
                      <motion.div
                        key={index}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          index === currentIndex 
                            ? 'w-4 bg-primary' 
                            : 'w-1 bg-foreground/40'
                        }`}
                        layoutId={`dot-${list.id}-${index}`}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              // Collage padrão
              <motion.div
                key="collage"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {coverImages.length > 0 ? (
                  <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {coverImages.map((url: string, index: number) => (
                      <div key={index} className="relative overflow-hidden">
                        <img
                          src={url || '/placeholder.svg'}
                          alt=""
                          className="w-full h-full object-cover"
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gradiente overlay (apenas quando não está em hover) */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none"
            animate={{ opacity: isHovered ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Badge público/privado */}
          <Badge 
            variant={list.is_public ? "success" : "secondary"}
            className="absolute top-2 left-2 backdrop-blur-sm transition-all duration-200 z-10"
          >
            {list.is_public ? (
              <><Globe className="h-3 w-3" /> Pública</>
            ) : (
              <><Lock className="h-3 w-3" /> Privada</>
            )}
          </Badge>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
