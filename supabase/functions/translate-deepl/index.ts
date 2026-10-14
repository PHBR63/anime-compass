import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { z } from "npm:zod@3";
import { ErroDeepl, gerarSugestoes } from "../_shared/deepl.ts";

// Ações: "generate" cria sugestões pendentes; "save" aplica as aprovadas; "reject" descarta.
const esquema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), scope: z.enum(["missing", "english"]).default("missing"), offset: z.number().int().min(0).max(1000000).default(0) }),
  z.object({ action: z.literal("save"), items: z.array(z.object({ mal_id: z.number().int().positive(), synopsis_pt: z.string().trim().min(1).max(10000) })).min(1).max(50) }),
  z.object({ action: z.literal("reject"), mal_ids: z.array(z.number().int().positive()).min(1).max(50) }),
]);

/** Responde JSON com CORS, inclusive em erros. */
function responder(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Gera, aprova ou rejeita traduções DeepL de sinopses, sempre com revisão administrativa. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder({ error: "Método não permitido" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
  const agora = new Date().toISOString();

  try {
    if (entrada.data.action === "reject") {
      await banco.from("translation_suggestions").update({ status: "rejected", reviewed_at: agora }).in("mal_id", entrada.data.mal_ids).eq("status", "pending");
      return responder({ success: true });
    }

    if (entrada.data.action === "save") {
      let salvos = 0;
      for (const item of entrada.data.items) {
        const { data: sugestao } = await banco.from("translation_suggestions").select("current_pt").eq("mal_id", item.mal_id).eq("status", "pending").maybeSingle();
        if (!sugestao) continue;
        // Só grava se o texto atual continuar igual ao da sugestão (vazio ou em inglês); nunca sobrescreve edições em PT-BR.
        let consulta = banco.from("anime_catalog").update({ synopsis_pt: item.synopsis_pt }).eq("mal_id", item.mal_id);
        consulta = sugestao.current_pt ? consulta.eq("synopsis_pt", sugestao.current_pt) : consulta.or("synopsis_pt.is.null,synopsis_pt.eq.");
        const { data, error } = await consulta.select("mal_id");
        if (error) throw error;
        const ok = (data?.length ?? 0) > 0;
        await banco.from("translation_suggestions").update({ status: ok ? "approved" : "rejected", suggested_text: item.synopsis_pt, reviewed_at: agora }).eq("mal_id", item.mal_id);
        if (ok) salvos++;
      }
      return responder({ success: true, saved: salvos, skipped: entrada.data.items.length - salvos });
    }

    // Gera sugestões de um lote do catálogo inteiro (ausentes ou em inglês).
    const { scope, offset } = entrada.data;
    let consulta = banco.from("anime_catalog").select("mal_id,title,synopsis,synopsis_pt")
      .not("synopsis", "is", null).neq("synopsis", "").order("members", { ascending: false, nullsFirst: false });
    consulta = scope === "missing" ? consulta.or("synopsis_pt.is.null,synopsis_pt.eq.") : consulta.not("synopsis_pt", "is", null).neq("synopsis_pt", "");
    // Varredura de inglês analisa 200 registros por vez; ausentes buscam 60 (alguns já têm sugestão).
    const tamanho = scope === "english" ? 200 : 60;
    const { data: animes, error } = await consulta.range(offset, offset + tamanho - 1);
    if (error) throw error;
    const criadas = await gerarSugestoes(banco, animes ?? [], "manual");
    const proximo = offset + tamanho;
    return responder({ success: true, created: criadas, nextOffset: proximo, done: (animes?.length ?? 0) < tamanho });
  } catch (e) {
    if (e instanceof ErroDeepl) return responder({ error: e.message }, e.status);
    console.error("translate-deepl", e);
    return responder({ error: "Erro interno ao processar traduções" }, 500);
  }
});
