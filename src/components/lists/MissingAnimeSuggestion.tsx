import { useMemo } from 'react';
import { ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import type { FranchiseGroup } from '@/lib/franchiseDetector';

interface MissingAnimeSuggestionProps {
  /** Grupos de franquias selecionadas */
  franchiseGroups: FranchiseGroup[];
  /** IDs dos animes atualmente selecionados */
  selectedIds: Set<string>;
  /** Classe CSS adicional */
  className?: string;
}

interface MissingFranchise {
  baseName: string;
  selectedCount: number;
  totalCount: number;
  missingCount: number;
}

/**
 * Componente que sugere animes faltando de franquias parcialmente selecionadas
 * com link para descobrir mais no Discover
 */
export function MissingAnimeSuggestion({ 
  franchiseGroups, 
  selectedIds,
  className 
}: MissingAnimeSuggestionProps) {
  const navigate = useNavigate();

  // Detecta franquias com animes faltando
  const missingFranchises = useMemo(() => {
    if (selectedIds.size === 0) return [];

    const missing: MissingFranchise[] = [];

    for (const group of franchiseGroups) {
      const selectedCount = group.entries.filter(e => selectedIds.has(e.id)).length;
      
      // Se tem algum selecionado mas não todos
      if (selectedCount > 0 && selectedCount < group.totalEntries) {
        missing.push({
          baseName: group.baseName,
          selectedCount,
          totalCount: group.totalEntries,
          missingCount: group.totalEntries - selectedCount,
        });
      }
    }

    // Ordenar por quantidade de faltantes
    return missing.sort((a, b) => b.missingCount - a.missingCount);
  }, [franchiseGroups, selectedIds]);

  // Navega para o Discover com busca
  const handleNavigateToDiscover = (franchiseName: string) => {
    navigate(`/discover?q=${encodeURIComponent(franchiseName)}`);
  };

  if (missingFranchises.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-muted-foreground">
          Franquias incompletas ({missingFranchises.length})
        </span>
      </div>

      <ScrollArea className="max-h-32">
        <div className="space-y-1.5">
          {missingFranchises.slice(0, 5).map((franchise) => (
            <motion.div
              key={franchise.baseName}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-xs truncate">{franchise.baseName}</span>
                <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">
                  {franchise.selectedCount}/{franchise.totalCount}
                </Badge>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 flex-shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/20"
                onClick={() => handleNavigateToDiscover(franchise.baseName)}
              >
                <ExternalLink className="h-3 w-3" />
                Buscar
              </Button>
            </motion.div>
          ))}
          
          {missingFranchises.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center py-1">
              +{missingFranchises.length - 5} outras franquias incompletas
            </p>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}