import { SakuraSpinnerFullscreen } from '@/components/ui/sakura-spinner';

/**
 * Skeleton genérico para páginas sem layout específico
 * Exibe o spinner de sakura centralizado
 */
export function GenericSkeleton() {
  return <SakuraSpinnerFullscreen text="Carregando..." />;
}
