/**
 * Filtros da Descobrir: gaveta com rascunho (só aplica ao confirmar) e chips removíveis.
 * Opções vêm das facetas globais do catálogo elegível; contagens rotuladas como "no catálogo".
 */
import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  STATUS_OPTIONS, TYPE_LABELS, activeChips, clearFilters, removeChip, validateYearRange,
  type DiscoverState,
} from '@/lib/discoverParams';
import type { DiscoverFacets, FacetItem } from '@/hooks/useDiscover';

// Valor sentinela: o Radix Select não aceita value="" em SelectItem.
const QUALQUER = '__qualquer';

interface SheetProps {
  state: DiscoverState;
  facets: DiscoverFacets | undefined;
  hideInList: boolean;
  canHide: boolean;
  onApply: (next: DiscoverState, hideInList: boolean) => void;
}

/** Lista pesquisável de facetas (gênero/estúdio) com seleção única e contagem global. */
function FacetPicker({ id, label, items, value, onChange }: {
  id: string; label: string; items: FacetItem[]; value: string | null; onChange: (v: string | null) => void;
}) {
  const [busca, setBusca] = useState('');
  // Busca em todos os itens (sem corte), normalizando acentos.
  const filtrados = useMemo(() => {
    const n = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = n(busca.trim());
    return q ? items.filter(i => n(i.name).includes(q)) : items;
  }, [items, busca]);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <Input id={id} value={busca} onChange={e => setBusca(e.target.value)} placeholder={`Buscar ${label.toLowerCase()}…`} aria-label={`Buscar ${label.toLowerCase()}`} className="h-9" />
      <div role="radiogroup" aria-label={label} className="max-h-48 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
        <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)}
          className={`w-full flex justify-between px-3 py-2 text-sm text-left focus-visible:outline-none focus-visible:bg-accent ${value === null ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}>
          Qualquer
        </button>
        {filtrados.map(i => (
          <button key={i.name} type="button" role="radio" aria-checked={value === i.name} onClick={() => onChange(i.name)}
            className={`w-full flex justify-between gap-2 px-3 py-2 text-sm text-left focus-visible:outline-none focus-visible:bg-accent ${value === i.name ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}>
            <span className="truncate">{i.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{i.count.toLocaleString('pt-BR')}</span>
          </button>
        ))}
        {filtrados.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Nada encontrado.</p>}
      </div>
      <p className="text-[11px] text-muted-foreground">Números = títulos no catálogo inteiro ({items.length.toLocaleString('pt-BR')} opções).</p>
    </fieldset>
  );
}

/** Gaveta de filtros. Edita um rascunho e só altera a busca ao clicar em "Aplicar". */
export function DiscoverFiltersSheet({ state, facets, hideInList, canHide, onApply }: SheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(state);
  const [draftHide, setDraftHide] = useState(hideInList);
  // Ao abrir, o rascunho parte do estado aplicado atual.
  useEffect(() => { if (open) { setDraft(state); setDraftHide(hideInList); } }, [open, state, hideInList]);

  const erroAno = validateYearRange(draft.yearMin, draft.yearMax);
  const anos = facets?.years ?? [];
  const tipos = (facets?.types ?? []).filter(t => t.value !== '__sem_tipo');
  const ativos = activeChips(state).filter(c => c.key !== 'search').length + (hideInList ? 1 : 0);

  const set = <K extends keyof DiscoverState>(k: K, v: DiscoverState[K]) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 gap-2 shrink-0" aria-label={`Abrir filtros${ativos ? ` (${ativos} ativos)` : ''}`}>
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {ativos > 0 && <Badge className="h-5 min-w-5 px-1.5">{ativos}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>As mudanças só valem depois de clicar em Aplicar.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-tipo">Formato</Label>
              <Select value={draft.type ?? QUALQUER} onValueChange={v => set('type', v === QUALQUER ? null : v)}>
                <SelectTrigger id="f-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={QUALQUER}>Qualquer</SelectItem>
                  {tipos.map(t => <SelectItem key={t.value} value={t.value}>{TYPE_LABELS[t.value] ?? t.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {state.mode === 'catalog' && (
              <div className="space-y-1.5">
                <Label htmlFor="f-status">Situação</Label>
                <Select value={draft.status ?? QUALQUER} onValueChange={v => set('status', v === QUALQUER ? null : v as DiscoverState['status'])}>
                  <SelectTrigger id="f-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QUALQUER}>Qualquer</SelectItem>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="f-de">Ano inicial</Label>
              <Select value={draft.yearMin !== null ? String(draft.yearMin) : QUALQUER} onValueChange={v => set('yearMin', v === QUALQUER ? null : Number(v))}>
                <SelectTrigger id="f-de"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={QUALQUER}>Qualquer</SelectItem>
                  {anos.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-ate">Ano final</Label>
              <Select value={draft.yearMax !== null ? String(draft.yearMax) : QUALQUER} onValueChange={v => set('yearMax', v === QUALQUER ? null : Number(v))}>
                <SelectTrigger id="f-ate" aria-invalid={!!erroAno}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={QUALQUER}>Qualquer</SelectItem>
                  {anos.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="f-nota">Nota mínima</Label>
              <Select value={draft.scoreMin !== null ? String(draft.scoreMin) : QUALQUER} onValueChange={v => set('scoreMin', v === QUALQUER ? null : Number(v))}>
                <SelectTrigger id="f-nota"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={QUALQUER}>Qualquer</SelectItem>
                  {[9, 8, 7, 6, 5].map(n => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {erroAno && <p role="alert" className="text-sm text-destructive">{erroAno}</p>}
          <FacetPicker id="f-genero" label="Gênero" items={facets?.genres ?? []} value={draft.genre} onChange={v => set('genre', v)} />
          <FacetPicker id="f-estudio" label="Estúdio" items={facets?.studios ?? []} value={draft.studio} onChange={v => set('studio', v)} />
          {canHide && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
              <Label htmlFor="f-ocultar" className="text-sm">Ocultar animes que já estão na minha lista</Label>
              <Switch id="f-ocultar" checked={draftHide} onCheckedChange={setDraftHide} />
            </div>
          )}
        </div>
        <SheetFooter className="px-5 pb-5 pt-3 border-t border-border/50 flex-row gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => { setDraft(clearFilters(draft)); setDraftHide(false); }}>Limpar</Button>
          <Button className="flex-1" disabled={!!erroAno} onClick={() => { onApply(draft, draftHide); setOpen(false); }}>Aplicar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Chips dos filtros aplicados, cada um removível, mais "Limpar tudo". */
export function ActiveFilterChips({ state, hideInList, onChange, onHideChange }: {
  state: DiscoverState; hideInList: boolean;
  onChange: (s: DiscoverState) => void; onHideChange: (v: boolean) => void;
}) {
  const chips = activeChips(state);
  if (!chips.length && !hideInList) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
      {chips.map(c => (
        <Badge key={c.key} variant="secondary" className="gap-1 pr-1 py-1 max-w-full">
          <span className="truncate">{c.label}</span>
          <button type="button" onClick={() => onChange(removeChip(state, c.key))} aria-label={`Remover ${c.label}`}
            className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {hideInList && (
        <Badge variant="secondary" className="gap-1 pr-1 py-1">
          Ocultando minha lista
          <button type="button" onClick={() => onHideChange(false)} aria-label="Mostrar também animes da minha lista"
            className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      <Button variant="link" size="sm" className="h-7 px-1" onClick={() => { onChange(clearFilters(state)); onHideChange(false); }}>
        Limpar tudo
      </Button>
    </div>
  );
}
