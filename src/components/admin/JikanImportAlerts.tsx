import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Alertas de importação automática do Jikan.
 * Mostra um aviso no topo do painel quando a última execução agendada
 * falhou ou terminou com erros ainda não resolvidos, com botão para
 * tentar novamente sem abrir o Histórico.
 */
export function JikanImportAlerts() {
  const [tentando, setTentando] = useState(false);
  const cliente = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["jikan-import-alerts"],
    queryFn: async () => {
      // Busca as execuções com erro ainda não resolvidas (mais recentes primeiro).
      const { data, error } = await supabase
        .from("jikan_import_history")
        .select("id, page, mode, started_at, error_message, cover_failures, status, resolved_at")
        .eq("status", "error")
        .is("resolved_at", null)
        .order("started_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Atualiza sozinho a cada 30 segundos.
  });

  // Nada a avisar: não renderiza nada.
  if (!data.length) return null;

  const maisRecente = data[0];
  const dataHora = new Date(maisRecente.started_at).toLocaleString("pt-BR");

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <XCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Importação do Jikan com erro
      </AlertTitle>
      <AlertDescription className="space-y-1 text-xs sm:text-sm">
        <p>
          A última execução falhou em {dataHora} (página {maisRecente.page},{" "}
          {maisRecente.mode === "season" ? "temporada" : "completa"}):{" "}
          <span className="break-words">{maisRecente.error_message}</span>
        </p>
        {data.length > 1 && (
          <p className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Há {data.length} execuções com erro aguardando resolução. Veja a aba Catálogo → Histórico.
          </p>
        )}
        <p className="text-muted-foreground">
          A importação tenta de novo sozinha na próxima execução agendada ou ao retomar pelo painel.
        </p>
      </AlertDescription>
    </Alert>
  );
}
