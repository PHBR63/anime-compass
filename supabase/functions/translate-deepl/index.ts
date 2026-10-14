import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// Ações: "preview" traduz sem salvar; "save" grava apenas traduções revisadas.
const esquema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).max(100000).default(0) }),
  z.object({
    action: z.literal("save"),
    items: z.array(z.object({ mal_id: z.number().int().positive(), synopsis_pt: z.string().trim().min(1).max(10000) })).min(1).max(25),
  }),
]);

/** Responde JSON com CORS, inclusive em erros. */
function responder(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Traduz sinopses ausentes via DeepL para revisão administrativa, sem sobrescrever textos existentes. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder({ error: "Método não permitido" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const chaveDeepl = Deno.env.get("DEEPL_API_KEY");
  if (!url || !anon || !servico) return responder({ error: "Configuração indisponível" }, 500);

  // Autorização no servidor: apenas administradores.
  const cliente = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u, error: eu } = await cliente.auth.getUser();
  if (eu || !u.user) return responder({ error: "Entre na sua conta" }, 401);
  const { data: admin } = await cliente.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!admin) return responder({ error: "Acesso restrito a administradores" }, 403);

  const entrada = esquema.safeParse(await req.json().catch(() => null));
  if (!entrada.success) return responder({ error: "Parâmetros inválidos", details: entrada.error.flatten() }, 400);
  const banco = createClient(url, servico);

  try {
    if (entrada.data.action === "save") {
      let salvos = 0;
      for (const item of entrada.data.items) {
        // Condição no banco: só grava se a sinopse PT-BR continuar vazia.
        const { data, error } = await banco.from("anime_catalog")
          .update({ synopsis_pt: item.synopsis_pt })
          .eq("mal_id", item.mal_id)
          .or("synopsis_pt.is.null,synopsis_pt.eq.")
          .select("mal_id");
        if (error) throw error;
        salvos += data?.length ?? 0;
      }
      return responder({ success: true, saved: salvos, skipped: entrada.data.items.length - salvos });
    }

    if (!chaveDeepl) return responder({ error: "Chave do DeepL não configurada" }, 503);
    const { limit, offset } = entrada.data;
    // Busca animes com sinopse original mas sem versão em PT-BR.
    const { data: animes, error, count } = await banco.from("anime_catalog")
      .select("mal_id,title,synopsis", { count: "exact" })
      .or("synopsis_pt.is.null,synopsis_pt.eq.")
      .not("synopsis", "is", null).neq("synopsis", "")
      .order("members", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    if (!animes?.length) return responder({ success: true, items: [], pending: count ?? 0 });

    // Chaves gratuitas terminam com ":fx" e usam outro domínio.
    const host = chaveDeepl.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const resposta = await fetch(`${host}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${chaveDeepl}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: animes.map(a => a.synopsis), target_lang: "PT-BR", source_lang: "EN" }),
      signal: AbortSignal.timeout(30000),
    });
    if (!resposta.ok) {
      const corpo = await resposta.text();
      console.error(`DeepL falhou [${resposta.status}]: ${corpo}`);
      const msg = resposta.status === 456 ? "Cota do DeepL esgotada neste mês"
        : resposta.status === 403 ? "Chave do DeepL inválida"
        : resposta.status === 429 ? "Muitas solicitações ao DeepL; aguarde e tente novamente"
        : "Falha ao traduzir com o DeepL";
      return responder({ error: msg, status: resposta.status }, resposta.status === 456 ? 402 : resposta.status);
    }
    const { translations } = await resposta.json() as { translations: { text: string }[] };
    return responder({
      success: true,
      pending: count ?? 0,
      items: animes.map((a, i) => ({ mal_id: a.mal_id, title: a.title, synopsis: a.synopsis, synopsis_pt: translations[i]?.text ?? "" })),
    });
  } catch (e) {
    console.error("translate-deepl", e);
    return responder({ error: "Erro interno ao processar traduções" }, 500);
  }
});
