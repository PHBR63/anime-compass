import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTree, RefreshCw } from "lucide-react";

/** Registro de um anime tocado pela importação do Kitsu (tabela kitsu_import_items). */
type ItemKitsu = {
  id: string;
  created_at: string;
  mode: string;
  page: number;
  kitsu_id: number | null;
  mal_id: number;
  title: string | null;
  acao: string;
  campos: string[];
  capa: boolean;
};

/** Rótulos em português para os campos que a importação preencheu. */
const ROTULOS_CAMPOS: Record<string, string> = {
  title_english: "Título (EN)",
  title_japanese: "Título (JP)",
  synopsis: "Sinopse (EN)",
  synopsis_pt: "Sinopse (PT-BR)",
  score: "Nota",
  scored_by: "Avaliações",
  rank: "Posição",
  popularity: "Popularidade",
  members: "Membros",
  episodes: "Episódios",
  status: "Status",
  type: "Formato",
  rating: "Classificação",
  year: "Ano",
  season: "Temporada",
  image_url: "Capa (URL)",
  local_image_url: "Capa local",
};

/** Filtros de ação disponíveis na lista. */
const ACOES = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "criado", rotulo: "Novos" },
  { valor: "completado", rotulo: "Completados" },
] as const;

/** Lista o que a importação do Kitsu tocou: animes criados, completados e capas baixadas. */
export function KitsuImportItems() {
  const [filtro, setFiltro] = useState<(typeof ACOES)[number]["valor"]>("todos");
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kitsu-import-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kitsu_import_items").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as ItemKitsu[];
    },
    refetchInterval: 15000,
  });

  const filtrados = filtro === "todos" ? data : data.filter(i => i.acao === filtro);
  const novos = data.filter(i => i.acao === "criado").length;
  const completados = data.filter(i => i.acao === "completado").length;
  const comCapa = data.filter(i => i.capa).length;

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 sm:p-6">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><ListTree className="h-5 w-5 text-primary" />Animes importados do Kitsu</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Últimos 100 animes tocados pela importação.</CardDescription>
        </div>
        <Button size="icon" variant="ghost" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar lista de animes">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted p-2 text-center">
            <p className="text-base font-semibold sm:text-lg">{novos}</p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Novos</p>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <p className="text-base font-semibold sm:text-lg">{completados}</p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Completados</p>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <p className="text-base font-semibold sm:text-lg">{comCapa}</p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Com capa salva</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ACOES.map(a => (
            <Button key={a.valor} size="sm" variant={filtro === a.valor ? "default" : "outline"} className="h-7 px-2.5 text-xs" onClick={() => setFiltro(a.valor)}>
              {a.rotulo}
            </Button>
          ))}
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && !filtrados.length && (
          <p className="text-sm text-muted-foreground">
            {data.length ? "Nenhum anime nesse filtro." : "Nenhum anime registrado ainda — a lista é preenchida conforme a importação roda."}
          </p>
        )}
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
          {filtrados.map(i => (
            <li key={i.id} className="min-w-0 rounded-md border border-border p-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge variant={i.acao === "criado" ? "default" : "secondary"}>{i.acao === "criado" ? "Novo" : "Completado"}</Badge>
                <span className="min-w-0 flex-1 truncate font-medium">{i.title ?? `Anime ${i.mal_id}`}</span>
                {i.capa && <Badge variant="outline" className="shrink-0">Capa salva</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                <span>MAL #{i.mal_id}</span>
                {i.kitsu_id !== null && <span>· Kitsu #{i.kitsu_id}</span>}
                <span>· Página {i.page} · {i.mode === "discover" ? "Novos" : "Completar"}</span>
                <span>· {new Date(i.created_at).toLocaleString("pt-BR")}</span>
              </div>
              {i.campos.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {i.campos.map(c => (
                    <Badge key={c} variant="outline" className="text-[10px] font-normal">{ROTULOS_CAMPOS[c] ?? c}</Badge>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
