import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Languages, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface Edicao { texto: string; aprovado: boolean }

/** Extrai a mensagem real de erro devolvida pela função. */
async function lerErro(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try { return (await error.context.json()).error ?? "Falha na tradução"; } catch { return "Falha na tradução"; }
  }
  return error instanceof Error ? error.message : "Falha na tradução";
}

/** Fila de revisão das traduções DeepL geradas automaticamente ou sob demanda. */
export function DeeplTranslationReview() {
  const cliente = useQueryClient();
  const [edicoes, setEdicoes] = useState<Record<number, Edicao>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ missing: 0, english: 0 });

  const { data: pendentes = [], isLoading } = useQuery({
    queryKey: ["translation-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("translation_suggestions").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
  });

  // Inicializa a edição de novas sugestões sem perder o que já foi alterado.
  useEffect(() => {
    setEdicoes(atual => {
      const novo = { ...atual };
      for (const s of pendentes) if (!novo[s.mal_id]) novo[s.mal_id] = { texto: s.suggested_text, aprovado: true };
      return novo;
    });
  }, [pendentes]);

  /** Chama a função de tradução e recarrega a fila. */
  const chamar = async (rotulo: string, corpo: object) => {
    setOcupado(rotulo); setErro(null);
    const { data, error } = await supabase.functions.invoke("translate-deepl", { body: corpo });
    setOcupado(null);
    if (error) { setErro(await lerErro(error)); return null; }
    await cliente.invalidateQueries({ queryKey: ["translation-suggestions"] });
    return data;
  };

  /** Gera novas sugestões de um lote do catálogo. */
  const gerar = async (scope: "missing" | "english") => {
    const data = await chamar(scope, { action: "generate", scope, offset: cursor[scope] });
    if (!data) return;
    setCursor(c => ({ ...c, [scope]: data.done ? 0 : data.nextOffset }));
    toast[data.created ? "success" : "info"](data.created ? `${data.created} tradução(ões) para revisar` : data.done ? "Nenhuma sinopse restante neste filtro" : "Nada novo neste lote; tente o próximo");
  };

  const selecionados = pendentes.filter(s => edicoes[s.mal_id]?.aprovado);

  /** Salva as aprovadas; o servidor ignora as que foram editadas por outra pessoa. */
  const salvar = async () => {
    const itens = selecionados.map(s => ({ mal_id: s.mal_id, synopsis_pt: edicoes[s.mal_id].texto })).filter(i => i.synopsis_pt.trim());
    if (!itens.length) return;
    const data = await chamar("save", { action: "save", items: itens });
    if (data) toast.success(`${data.saved} salva(s)${data.skipped ? `, ${data.skipped} ignorada(s) porque o texto mudou` : ""}`);
  };

  /** Descarta as sugestões desmarcadas. */
  const rejeitar = async () => {
    const ids = pendentes.filter(s => !edicoes[s.mal_id]?.aprovado).map(s => s.mal_id);
    if (!ids.length) { toast.info("Desmarque as traduções que deseja descartar"); return; }
    if (await chamar("reject", { action: "reject", mal_ids: ids })) toast.success(`${ids.length} descartada(s)`);
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Languages className="h-5 w-5 text-primary" />Revisão de traduções (DeepL)</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Cada importação do Jikan traduz automaticamente as sinopses ausentes ou em inglês. Nada é salvo antes da sua aprovação, e textos editados em português nunca são substituídos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={() => gerar("missing")} disabled={!!ocupado} className="w-full sm:w-auto">
            {ocupado === "missing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Traduzir ausentes
          </Button>
          <Button variant="outline" onClick={() => gerar("english")} disabled={!!ocupado} className="w-full sm:w-auto">
            {ocupado === "english" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Procurar sinopses em inglês
          </Button>
          {pendentes.length > 0 && (<>
            <Button onClick={salvar} disabled={!!ocupado || !selecionados.length} className="w-full sm:w-auto">
              {ocupado === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar marcadas ({selecionados.length})
            </Button>
            <Button variant="ghost" onClick={rejeitar} disabled={!!ocupado} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />Descartar desmarcadas
            </Button>
          </>)}
        </div>
        {erro && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && !pendentes.length && <p className="text-sm text-muted-foreground">Nenhuma tradução aguardando revisão.</p>}
        <div className="max-h-[36rem] space-y-3 overflow-y-auto">
          {pendentes.map(s => (
            <div key={s.mal_id} className="space-y-2 rounded-lg border border-border p-3 min-w-0">
              <label className="flex items-center gap-2 min-w-0">
                <Checkbox checked={edicoes[s.mal_id]?.aprovado ?? true} onCheckedChange={v => setEdicoes(e => ({ ...e, [s.mal_id]: { ...e[s.mal_id], aprovado: v === true } }))} />
                <span className="truncate text-sm font-medium">{s.title}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">{s.reason === "english" ? "Estava em inglês" : "Sem tradução"}</Badge>
                {s.origin === "import" && <Badge variant="secondary" className="hidden shrink-0 text-[10px] sm:inline-flex">Automática</Badge>}
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-md bg-muted p-2 text-xs text-muted-foreground">{s.source_text}</p>
                <Textarea value={edicoes[s.mal_id]?.texto ?? s.suggested_text} onChange={ev => setEdicoes(e => ({ ...e, [s.mal_id]: { aprovado: e[s.mal_id]?.aprovado ?? true, texto: ev.target.value } }))} className="min-h-32 text-xs" aria-label={`Tradução de ${s.title}`} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
