import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, ChevronDown, Database, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';
import { DiscoverAnimeCard } from '@/components/anime/DiscoverAnimeCard';
import { DiscoverFiltersSheet, ActiveFilterChips } from '@/components/anime/DiscoverFilters';
import { SakuraPetals, WavePattern } from '@/components/backgrounds';
import { NeonText } from '@/components/animations';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoverCatalog, useDiscoverFacets, dedupeByMalId } from '@/hooks/useDiscover';
import {
  SEASONS, SORT_OPTIONS, hideInListStorageKey, parseDiscoverParams, seasonOf, sortOrderOf,
  toDiscoverParams, toRpcFilters, type DiscoverMode, type DiscoverState, type SeasonName,
} from '@/lib/discoverParams';

// Modos visíveis no topo.
const MODES: { value: DiscoverMode; label: string }[] = [
  { value: 'catalog', label: 'Catálogo' },
  { value: 'season', label: 'Temporada' },
  { value: 'airing', label: 'Em exibição' },
  { value: 'upcoming', label: 'Próximos lançamentos' },
];

/**
 * Página Descobrir: uma consulta ativa por vez, total exato do banco,
 * estado completo na URL (voltar/recarregar mantêm filtros) e paginação por "Carregar mais".
 */
export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseDiscoverParams(searchParams), [searchParams]);
  const { user } = useAuth();
  const [selectedMalId, setSelectedMalId] = useState<number | null>(null);

  // Preferência "ocultar minha lista" salva por conta (não vaza entre usuários do mesmo aparelho).
  const storageKey = hideInListStorageKey(user?.id);
  const [hideInList, setHideInList] = useState(false);
  useEffect(() => {
    setHideInList(storageKey ? localStorage.getItem(storageKey) === 'true' : false);
  }, [storageKey]);
  const changeHide = useCallback((v: boolean) => {
    setHideInList(v);
    if (storageKey) localStorage.setItem(storageKey, String(v));
  }, [storageKey]);

  /** Grava o novo estado na URL (entra no histórico do navegador). */
  const commit = useCallback((next: DiscoverState, replace = false) => {
    setSearchParams(toDiscoverParams(next), { replace });
  }, [setSearchParams]);

  // Campo de busca local com debounce de 400 ms antes de ir para a URL.
  const [searchInput, setSearchInput] = useState(state.search);
  useEffect(() => { setSearchInput(state.search); }, [state.search]);
  useEffect(() => {
    if (searchInput === state.search) return;
    const t = setTimeout(() => commit({ ...state, search: searchInput }, true), 400);
    return () => clearTimeout(t);
  }, [searchInput, state, commit]);

  const { data: facets } = useDiscoverFacets();
  const filters = useMemo(() => toRpcFilters(state, hideInList && !!user), [state, hideInList, user]);
  const query = useDiscoverCatalog(filters, state.sort, sortOrderOf(state.sort));

  const items = useMemo(() => dedupeByMalId(query.data?.pages.flatMap(p => p.items) ?? []), [query.data]);
  const total = query.data?.pages[0]?.total ?? null;
  const anos = facets?.years ?? [];
  const atual = seasonOf(new Date());

  // Desloca a temporada para trás/frente (ano + trimestre explícitos).
  const shiftSeason = (delta: number) => {
    const idx = SEASONS.findIndex(s => s.value === state.season) + delta;
    const year = state.seasonYear + Math.floor(idx / 4);
    commit({ ...state, season: SEASONS[((idx % 4) + 4) % 4].value, seasonYear: year });
  };

  return (
    <div className="relative space-y-5 pt-12 md:pt-0 pb-8 min-h-screen">
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <SakuraPetals petalCount={15} opacity={0.5} colors={['hsl(350, 100%, 85%)', 'hsl(var(--primary))']} />
      </div>
      <div className="fixed inset-0 -z-10 pointer-events-none"><WavePattern opacity={0.08} /></div>

      <header className="text-center max-w-2xl mx-auto">
        <h1 className="font-zen text-3xl md:text-4xl font-bold mb-1">
          Descubra Novos <NeonText color="primary">Animes</NeonText>
        </h1>
        <p className="text-sm text-muted-foreground">
          {facets ? `${facets.total.toLocaleString('pt-BR')} títulos disponíveis no catálogo` : 'Explore o catálogo'}
        </p>
      </header>

      {/* Busca + ordenação + filtros */}
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Label htmlFor="discover-busca" className="sr-only">Buscar por título</Label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input id="discover-busca" type="search" placeholder="Buscar por título..." value={searchInput}
              onChange={e => setSearchInput(e.target.value)} className="pl-9 h-11 bg-secondary/50 border-border/50 rounded-xl" />
          </div>
          <Select value={state.sort} onValueChange={v => commit({ ...state, sort: v as DiscoverState['sort'] })}>
            <SelectTrigger className="h-11 w-[9.5rem] sm:w-44 shrink-0" aria-label="Ordenar por"><SelectValue /></SelectTrigger>
            <SelectContent>{SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <DiscoverFiltersSheet state={state} facets={facets} hideInList={hideInList} canHide={!!user}
            onApply={(next, hide) => { changeHide(hide); commit(next); }} />
        </div>

        {/* Modos */}
        <div role="tablist" aria-label="Modo de navegação" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {MODES.map(m => (
            <Button key={m.value} role="tab" aria-selected={state.mode === m.value} size="sm"
              variant={state.mode === m.value ? 'default' : 'outline'} className="shrink-0 rounded-full"
              onClick={() => commit({ ...state, mode: m.value })}>
              {m.label}
            </Button>
          ))}
        </div>

        {state.mode === 'season' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Temporada anterior" onClick={() => shiftSeason(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Select value={state.season} onValueChange={v => commit({ ...state, season: v as SeasonName })}>
              <SelectTrigger className="h-9 w-48" aria-label="Trimestre"><SelectValue /></SelectTrigger>
              <SelectContent>{SEASONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(state.seasonYear)} onValueChange={v => commit({ ...state, seasonYear: Number(v) })}>
              <SelectTrigger className="h-9 w-24" aria-label="Ano da temporada"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(anos.includes(state.seasonYear) ? anos : [state.seasonYear, ...anos]).map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Próxima temporada" onClick={() => shiftSeason(1)}><ChevronRight className="h-4 w-4" /></Button>
            {(state.season !== atual.season || state.seasonYear !== atual.year) && (
              <Button variant="link" size="sm" onClick={() => commit({ ...state, season: atual.season, seasonYear: atual.year })}>Temporada atual</Button>
            )}
          </div>
        )}

        <ActiveFilterChips state={state} hideInList={hideInList && !!user} onChange={s => commit(s)} onHideChange={changeHide} />
      </div>

      {/* Resultados */}
      <section aria-live="polite" aria-busy={query.isLoading}>
        <p className="text-sm text-muted-foreground mb-4">
          {total !== null
            ? <>{total.toLocaleString('pt-BR')} resultado{total === 1 ? '' : 's'} · mostrando {items.length.toLocaleString('pt-BR')}</>
            : query.isLoading ? 'Carregando…' : null}
        </p>

        {query.isError ? (
          <Alert variant="destructive" className="max-w-xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>Houve uma falha de conexão ou do servidor. Isso não significa que não há resultados.</p>
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>Tentar de novo</Button>
            </AlertDescription>
          </Alert>
        ) : query.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="aspect-[3/4] rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum anime encontrado com esses filtros.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map(a => <DiscoverAnimeCard key={a.mal_id} anime={a} onOpen={setSelectedMalId} />)}
            </div>
            <div className="flex justify-center py-8">
              {query.hasNextPage ? (
                <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="gap-2">
                  {query.isFetchingNextPage ? <><Loader2 className="h-4 w-4 animate-spin" />Carregando…</> : <><ChevronDown className="h-4 w-4" />Carregar mais</>}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Fim dos resultados.</p>
              )}
            </div>
          </>
        )}
      </section>

      {/* Ficha completa buscada só ao abrir */}
      <AnimeDetailModal open={selectedMalId !== null} onOpenChange={o => { if (!o) setSelectedMalId(null); }} malId={selectedMalId ?? undefined} />
    </div>
  );
}
