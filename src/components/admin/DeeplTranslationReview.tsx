import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Languages, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Sugestao { mal_id: number; title: string; synopsis: string; synopsis_pt: string; aprovado: boolean }

/** Extrai a mensagem real de erro devolvida pela função. */
async function lerErro(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try { return (await error.context.json()).error ?? "Falha na tradução"; } catch { return "Falha na tradução"; }
  }
  return error instanceof Error ? error.message : "Falha na tradução";
}

/** Painel para gerar traduções DeepL das sinopses ausentes e revisá-las antes de salvar. */
export function DeeplTranslationReview() {
  const [itens, setItens] = useState<Sugestao[]>([]);
  const [pendentes, setPendentes] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Solicita um lote de traduções sem gravar nada. */
  const gerarLote = async () => {
    setCarregando(true); setErro(null);
    const { data, error } = await supabase.functions.invoke("translate-deepl", { body: { action: "preview", limit: 10 } });
    setCarregando(false);
    if (error) { setErro(await lerErro(error)); return; }
    setPendentes(data.pending);
    setItens(data.items.map((i: Omit<Sugestao, "aprovado">) => ({ ...i, aprovado: true })));
  };

  /** Atualiza um campo de uma sugestão revisada. */
  const alterar = (id: number, campo: Partial<Sugestao>) =>
    setItens(lista => lista.map(i => (i.mal_id === id ? { ...i, ...campo } : i)));

  /** Salva somente as traduções aprovadas e não vazias. */
  const salvar = async () => {
    const aprovados = itens.filter(i => i.aprovado && i.synopsis_pt.trim());
    if (!aprovados.length) { toast.info("Nenhuma tradução aprovada"); return; }
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke("translate-deepl", {
      body: { action: "save", items: aprovados.map(({ mal_id, synopsis_pt }) => ({ mal_id, synopsis_pt })) },
    });
    setSalvando(false);
    if (error) { toast.error(await lerErro(error)); return; }
    toast.success(`${data.saved} tradução(ões) salva(s)${data.skipped ? `, ${data.skipped} ignorada(s) por já terem texto` : ""}`);
    setItens([]);
    setPendentes(p => (p === null ? p : Math.max(0, p - data.saved)));
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Languages className="h-5 w-5 text-primary" />Tradução de sinopses (DeepL)</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Traduz apenas sinopses sem versão em português. Nada é salvo antes da sua revisão, e textos já cadastrados nunca são substituídos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={gerarLote} disabled={carregando || salvando} className="w-full sm:w-auto">
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}Traduzir próximo lote (10)
          </Button>
          {itens.length > 0 && (
            <Button variant="secondary" onClick={salvar} disabled={salvando} className="w-full sm:w-auto">
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar aprovadas ({itens.filter(i => i.aprovado).length})
            </Button>
          )}
          {pendentes !== null && <span className="text-xs text-muted-foreground">{pendentes} sinopse(s) sem tradução</span>}
        </div>
        {erro && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
        {itens.map(item => (
          <div key={item.mal_id} className="space-y-2 rounded-lg border border-border p-3 min-w-0">
            <label className="flex items-center gap-2 min-w-0">
              <Checkbox checked={item.aprovado} onCheckedChange={v => alterar(item.mal_id, { aprovado: v === true })} />
              <span className="truncate text-sm font-medium">{item.title}</span>
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <p className="max-h-40 overflow-y-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">{item.synopsis}</p>
              <Textarea value={item.synopsis_pt} onChange={e => alterar(item.mal_id, { synopsis_pt: e.target.value })} className="min-h-32 text-xs" aria-label={`Tradução de ${item.title}`} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
