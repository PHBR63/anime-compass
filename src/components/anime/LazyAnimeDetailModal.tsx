/**
 * Wrapper para lazy loading do AnimeDetailModal
 * Reduz o bundle inicial carregando o modal apenas quando necessário
 */

import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CatalogAnime } from '@/types/catalog';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];

// Lazy load do modal pesado
const AnimeDetailModal = lazy(() => 
  import('./AnimeDetailModal').then(mod => ({ default: mod.AnimeDetailModal }))
);

interface LazyAnimeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  malId?: number;
  userEntry?: AnimeEntry;
  catalogAnime?: CatalogAnime;
}

// Skeleton de loading do modal
function ModalLoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Header skeleton */}
      <div className="flex gap-4">
        <Skeleton className="w-32 h-48 rounded-lg shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
      {/* Synopsis skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Actions skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Modal de detalhes de anime com lazy loading
 * Carrega o componente pesado apenas quando o modal é aberto
 */
export function LazyAnimeDetailModal(props: LazyAnimeDetailModalProps) {
  const { open, onOpenChange, ...rest } = props;

  // Não renderiza nada se não está aberto (evita carregar Suspense desnecessariamente)
  if (!open) return null;

  return (
    <Suspense 
      fallback={
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ModalLoadingSkeleton />
          </DialogContent>
        </Dialog>
      }
    >
      <AnimeDetailModal open={open} onOpenChange={onOpenChange} {...rest} />
    </Suspense>
  );
}
