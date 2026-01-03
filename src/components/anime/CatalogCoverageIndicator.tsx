/**
 * Indicador de cobertura do catálogo
 * Mostra quantos animes da lista do usuário estão no catálogo
 */

import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Database, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useCatalogStatus } from '@/hooks/useAnimeApi';
import { useQuery } from '@tanstack/react-query';
import { CATALOG_API_URL } from '@/lib/apiConfig';

// Usar URL centralizada
const API_URL = CATALOG_API_URL;

/**
 * Verifica quais animes da lista do usuário estão no catálogo
 */
function useCatalogCoverage() {
  const { data: entries, isLoading: loadingEntries } = useAnimeEntries();
  const { data: catalogStatus, isLoading: loadingCatalog } = useCatalogStatus();

  // Busca os mal_ids que existem no catálogo
  const { data: coverage, isLoading: loadingCoverage } = useQuery({
    queryKey: ['catalog-coverage', entries?.map(e => e.mal_id)],
    queryFn: async () => {
      if (!entries || entries.length === 0) {
        return { found: 0, missing: 0, missingAnimes: [] };
      }

      // Verifica cada anime do usuário no catálogo (em lotes)
      const malIds = entries.map(e => e.mal_id);
      const foundIds = new Set<number>();
      
      // Verifica em lotes de 50
      const batchSize = 50;
      for (let i = 0; i < malIds.length; i += batchSize) {
        const batch = malIds.slice(i, i + batchSize);
        
        // Busca cada ID no catálogo
        const promises = batch.map(async (malId) => {
          try {
            const response = await fetch(`${API_URL}?mal_id=${malId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                foundIds.add(malId);
              }
            }
          } catch {
            // Ignora erros individuais
          }
        });
        
        await Promise.all(promises);
      }

      const missingAnimes = entries
        .filter(e => !foundIds.has(e.mal_id))
        .map(e => ({ mal_id: e.mal_id, title: e.title }));

      return {
        found: foundIds.size,
        missing: malIds.length - foundIds.size,
        missingAnimes,
      };
    },
    enabled: !!entries && entries.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const isLoading = loadingEntries || loadingCatalog || loadingCoverage;
  const totalAnimes = entries?.length || 0;
  const foundCount = coverage?.found || 0;
  const missingCount = coverage?.missing || 0;
  const missingAnimes = coverage?.missingAnimes || [];
  const coveragePercentage = totalAnimes > 0 ? Math.round((foundCount / totalAnimes) * 100) : 0;

  return {
    isLoading,
    totalAnimes,
    foundCount,
    missingCount,
    missingAnimes,
    coveragePercentage,
    catalogTotal: catalogStatus?.totalAnimes || 0,
  };
}

/**
 * Componente compacto para exibir na barra de ferramentas
 */
export function CatalogCoverageBadge() {
  const { 
    isLoading, 
    totalAnimes, 
    foundCount, 
    missingCount, 
    coveragePercentage,
    missingAnimes 
  } = useCatalogCoverage();

  if (totalAnimes === 0) return null;

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Verificando catálogo...</span>
      </Badge>
    );
  }

  const isFullCoverage = missingCount === 0;

  return (
    <TooltipProvider>
      <HoverCard>
        <HoverCardTrigger asChild>
          <Badge 
            variant={isFullCoverage ? "default" : "secondary"} 
            className={`gap-1.5 cursor-help ${isFullCoverage ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' : ''}`}
          >
            {isFullCoverage ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Database className="h-3 w-3" />
            )}
            <span className="text-xs">
              {isFullCoverage 
                ? 'Catálogo 100%' 
                : `${missingCount} fora do catálogo`
              }
            </span>
          </Badge>
        </HoverCardTrigger>
        <HoverCardContent className="w-72">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="font-medium">Cobertura do Catálogo</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seus animes no catálogo</span>
                <span className="font-medium">{foundCount}/{totalAnimes}</span>
              </div>
              <Progress value={coveragePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {coveragePercentage}% dos seus animes estão no catálogo local
              </p>
            </div>

            {missingCount > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs text-muted-foreground">
                    {missingCount} anime{missingCount > 1 ? 's' : ''} não encontrado{missingCount > 1 ? 's' : ''}:
                  </span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {missingAnimes.slice(0, 5).map((anime) => (
                    <p key={anime.mal_id} className="text-xs text-muted-foreground truncate pl-5">
                      • {anime.title}
                    </p>
                  ))}
                  {missingAnimes.length > 5 && (
                    <p className="text-xs text-muted-foreground pl-5">
                      ... e mais {missingAnimes.length - 5}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </TooltipProvider>
  );
}

/**
 * Componente expandido para dashboard ou settings
 */
export function CatalogCoverageCard() {
  const { 
    isLoading, 
    totalAnimes, 
    foundCount, 
    missingCount, 
    coveragePercentage,
    missingAnimes,
    catalogTotal 
  } = useCatalogCoverage();

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border bg-card animate-pulse">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Verificando cobertura do catálogo...</span>
        </div>
      </div>
    );
  }

  if (totalAnimes === 0) {
    return (
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Adicione animes à sua lista para verificar a cobertura do catálogo
          </span>
        </div>
      </div>
    );
  }

  const isFullCoverage = missingCount === 0;

  return (
    <div className="p-4 rounded-lg border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isFullCoverage ? 'bg-green-500/10' : 'bg-primary/10'}`}>
            {isFullCoverage ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Database className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h4 className="font-medium">Cobertura do Catálogo</h4>
            <p className="text-xs text-muted-foreground">
              {catalogTotal.toLocaleString()} animes no catálogo local
            </p>
          </div>
        </div>
        <Badge variant={isFullCoverage ? "default" : "secondary"} className="text-lg px-3">
          {coveragePercentage}%
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Animes encontrados</span>
          <span className="font-medium text-green-600 dark:text-green-400">{foundCount}</span>
        </div>
        <Progress value={coveragePercentage} className="h-3" />
        {missingCount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Não encontrados no catálogo</span>
            <span className="font-medium text-warning">{missingCount}</span>
          </div>
        )}
      </div>

      {missingCount > 0 && (
        <div className="pt-3 border-t">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">
              Animes não encontrados
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 bg-muted/50 rounded-md p-2">
            {missingAnimes.map((anime) => (
              <p key={anime.mal_id} className="text-xs text-muted-foreground">
                • {anime.title} <span className="opacity-60">(MAL: {anime.mal_id})</span>
              </p>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Estes animes foram adicionados manualmente e podem não ter informações completas.
          </p>
        </div>
      )}
    </div>
  );
}
