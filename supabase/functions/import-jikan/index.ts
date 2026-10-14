import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { mapearAnime, permitirAnime, obterCapa, type AnimeJikan, type TextosExistentes } from "./catalog.ts";

const esquema = z.object({
  action: z.enum(["status", "process", "reset"]).default("status"),
  mode: z.enum(["full", "season"]).default("full"),
  page: z.number().int().min(1).max(100000).default(1),
});
const chaveEstado = "jikan_import";

/** Devolve respostas JSON com CORS inclusive nos erros. */
function responder(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Importa uma página por chamada, com autorização administrativa e retomada persistida. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder({ error: "Método não permitido" }, 405);
  const urlBackend = Deno.env.get("SUPABASE_URL");
  const chavePublica = Deno.env.get("SUPABASE_ANON_KEY");
  const chavePrivada = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!urlBackend || !chavePublica || !chavePrivada) return responder({ error: "Configuração indisponível" }, 500);
  const authorization = req.headers.get("Authorization") ?? "";
  const clienteUsuario = createClient(urlBackend, chavePublica, { global: { headers: { Authorization: authorization } } });
  const { data: usuario, error: erroUsuario } = await clienteUsuario.auth.getUser();
  if (erroUsuario || !usuario.user) return responder({ error: "Entre na sua conta" }, 401);
  const { data: administrador, error: erroPapel } = await clienteUsuario.rpc("has_role", { _user_id: usuario.user.id, _role: "admin" });
  if (erroPapel || !administrador) return responder({ error: "Acesso restrito a administradores" }, 403);
  const entrada = esquema.safeParse(await req.json().catch(() => null));
  if (!entrada.success) return responder({ error: "Parâmetros inválidos", details: entrada.error.flatten() }, 400);
  const { action, mode, page } = entrada.data;
  const banco = createClient(urlBackend, chavePrivada);
  let possuiBloqueio = false;
  try {
    // Garante uma linha inicial sem substituir progresso de outra execução.
    const { error: erroInicial } = await banco.from("sync_state").upsert({ id: chaveEstado, mode: "full", current_page: 0, is_running: false }, { onConflict: "id", ignoreDuplicates: true });
    if (erroInicial) throw erroInicial;
    const { data: estado, error: erroEstado } = await banco.from("sync_state").select("*").eq("id", chaveEstado).single();
    if (erroEstado) throw erroEstado;
    if (action === "status") return responder({ success: true, data: estado });
    const agora = new Date().toISOString();
    const ocupado = estado.is_running && Date.now() - new Date(estado.updated_at).getTime() < 120000;
    if (ocupado) return responder({ error: "Uma página já está sendo processada; aguarde sua conclusão." }, 409);
    if (action === "reset") {
      const { error } = await banco.from("sync_state").update({ current_page: 0, total_synced: 0, max_page: null, is_running: false, last_error: null, updated_at: agora }).eq("id", chaveEstado).eq("updated_at", estado.updated_at);
      if (error) throw error;
      return responder({ success: true });
    }
    // Compare-and-swap impede importações simultâneas em abas diferentes.
    const { data: bloqueio, error: erroBloqueio } = await banco.from("sync_state").update({ is_running: true, updated_at: agora }).eq("id", chaveEstado).eq("updated_at", estado.updated_at).select("id");
    if (erroBloqueio) throw erroBloqueio;
    if (!bloqueio?.length) return responder({ error: "Outra importação iniciou; tente novamente." }, 409);
    possuiBloqueio = true;
    // Intervalo conservador: uma página a cada 1,2 s, abaixo de 60 consultas/minuto.
    const intervalo = Date.now() - new Date(estado.updated_at).getTime();
    if (intervalo < 1200) await new Promise(resolve => setTimeout(resolve, 1200 - intervalo));
    const caminho = mode === "season" ? "/seasons/now" : "/anime";
    const endereco = new URL(`https://api.jikan.moe/v4${caminho}`);
    endereco.searchParams.set("page", String(page));
    endereco.searchParams.set("limit", "25");
    if (mode === "full") { endereco.searchParams.set("order_by", "mal_id"); endereco.searchParams.set("sort", "asc"); }
    const resposta = await fetch(endereco, { signal: AbortSignal.timeout(20000) });
    if (!resposta.ok) {
      const detalhes = await resposta.text();
      console.error(`Jikan [${resposta.status}]: ${detalhes}`);
      throw new Error(`Jikan indisponível (${resposta.status}). ${resposta.status === 429 ? "Limite de consultas atingido; aguarde um minuto e retome." : "Retome a mesma página mais tarde."}`);
    }
    const resultado = await resposta.json();
    if (!Array.isArray(resultado.data) || !resultado.pagination) throw new Error("Resposta inválida do Jikan");
    const animes = (resultado.data as AnimeJikan[]).filter(anime => Number.isInteger(anime.mal_id) && anime.title && permitirAnime(anime));
    const ids = animes.map(anime => anime.mal_id);
    const { data: existentes, error: erroLeitura } = ids.length ? await banco.from("anime_catalog").select("mal_id,title,title_english,title_japanese,synopsis,local_image_url,image_url").in("mal_id", ids) : { data: [], error: null };
    if (erroLeitura) throw erroLeitura;
    const mapa = new Map((existentes ?? []).map(anime => [anime.mal_id, anime]));
    let novos = 0, atualizados = 0, capas = 0, falhasCapas = 0;
    // Pequenos grupos limitam tempo de execução e simultaneidade dos downloads.
    for (let i = 0; i < animes.length; i += 5) {
      await Promise.all(animes.slice(i, i + 5).map(async anime => {
        const existente = mapa.get(anime.mal_id);
        const registro = mapearAnime(anime, existente as TextosExistentes | undefined);
        const { error } = existente
          ? await banco.from("anime_catalog").update(registro).eq("mal_id", anime.mal_id)
          : await banco.from("anime_catalog").upsert(registro, { onConflict: "mal_id", ignoreDuplicates: true });
        if (error) throw error;
        if (existente) atualizados++; else novos++;
        const capa = obterCapa(anime);
        const localAtual = existente?.local_image_url?.startsWith(`${urlBackend}/storage/v1/object/public/anime-images/`);
        if (!capa || (localAtual && existente?.image_url === capa)) return;
        try {
          const imagem = await fetch(capa, { signal: AbortSignal.timeout(7000) });
          if (!imagem.ok) { await imagem.text(); throw new Error("Capa indisponível"); }
          const tipo = imagem.headers.get("content-type")?.split(";")[0] ?? "";
          const bytes = await imagem.arrayBuffer();
          if (!["image/jpeg", "image/png", "image/webp"].includes(tipo) || bytes.byteLength > 5000000) throw new Error("Formato de capa inválido");
          const extensao = tipo === "image/webp" ? "webp" : tipo === "image/png" ? "png" : "jpg";
          const arquivo = `covers/${anime.mal_id}.${extensao}`;
          const { error: erroUpload } = await banco.storage.from("anime-images").upload(arquivo, bytes, { contentType: tipo, upsert: true });
          if (erroUpload) throw erroUpload;
          const { data: publica } = banco.storage.from("anime-images").getPublicUrl(arquivo);
          const { error: erroCapa } = await banco.from("anime_catalog").update({ local_image_url: publica.publicUrl }).eq("mal_id", anime.mal_id);
          if (erroCapa) throw erroCapa;
          capas++;
        } catch { falhasCapas++; /* Mantém URL original e a capa local anterior para posterior sincronização. */ }
      }));
    }
    const continuar = resultado.pagination.has_next_page === true;
    const total = (page === 1 ? 0 : estado.total_synced ?? 0) + novos + atualizados;
    const { error: erroFinal } = await banco.from("sync_state").update({ mode, current_page: page, max_page: resultado.pagination.last_visible_page, total_synced: total, is_running: false, last_error: null, last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", chaveEstado);
    if (erroFinal) throw erroFinal;
    return responder({ success: true, continue: continuar, page, totalPages: resultado.pagination.last_visible_page, processed: total, stats: { novos, atualizados, capas, falhasCapas, filtrados: resultado.data.length - animes.length } });
  } catch (erro) {
    const mensagem = erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError")
      ? "O Jikan demorou demais para responder. Aguarde e retome a importação; nenhum progresso será perdido."
      : erro instanceof Error ? erro.message : "Falha na importação";
    if (possuiBloqueio) await banco.from("sync_state").update({ is_running: false, last_error: mensagem, updated_at: new Date().toISOString() }).eq("id", chaveEstado);
    return responder({ success: false, error: mensagem }, 502);
  }
});