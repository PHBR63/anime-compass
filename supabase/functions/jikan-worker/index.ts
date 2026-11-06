import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authorizePrivilegedRequest } from "../_shared/authorization.ts";
import { classificarRespostaWorker } from "./lifecycle.ts";

/** Devolve somente estado operacional público, nunca credenciais do agendador. */
function responder(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Executor curto: uma página por despertar, com recuperação durável pelo banco. */
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder({ error: "Método não permitido" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return responder({ error: "Configuração indisponível" }, 503);
  const banco = createClient(url, key);
  // Somente o agendador protegido pode adquirir trabalho; sessão admin usa o comando do importador.
  if (!req.headers.get("x-cron-token")) return responder({ error: "Agendamento não autorizado" }, 401);
  const acesso = await authorizePrivilegedRequest(req, {
    getUser: async () => null,
    isAdmin: async () => false,
    getCronHash: async name => {
      const { data, error } = await banco.from("cron_token_hashes").select("token_hash").eq("name", name).maybeSingle();
      if (error) throw error;
      return data?.token_hash ?? null;
    },
  }, "jikan_daily");
  if (acesso.status !== 200) return responder({ error: acesso.error }, acesso.status);
  try {
    const { data: trabalho, error } = await banco.rpc("jikan_server_claim");
    if (error) throw error;
    if (!trabalho) return responder({ success: true, idle: true });
    let resultado = { retryable: true, error: "A chamada foi interrompida; o checkpoint será reconciliado.", waitMs: 60000 };
    try {
      const resposta = await fetch(`${url}/functions/v1/import-jikan`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-cron-token": req.headers.get("x-cron-token") ?? "" },
        body: JSON.stringify({ workerLease: trabalho.lease, depth: 0 }), signal: AbortSignal.timeout(150000),
      });
      resultado = classificarRespostaWorker(resposta.status, await resposta.json().catch(() => null));
    } catch { /* A concessão e o checkpoint recuperam inclusive perda da resposta. */ }
    const { data: confirmado, error: erroFinal } = await banco.rpc("jikan_server_finish", {
      p_lease: trabalho.lease, p_page: trabalho.page, p_retryable: resultado.retryable,
      p_error: resultado.error, p_wait_ms: resultado.waitMs,
    });
    if (erroFinal) throw erroFinal;
    return responder({ success: true, data: confirmado });
  } catch { return responder({ error: "Executor indisponível; recuperação programada permanece ativa." }, 503); }
});