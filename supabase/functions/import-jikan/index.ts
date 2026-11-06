import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { z } from "npm:zod@3";
import { gerarSugestoes } from "../_shared/deepl.ts";
import { mapearAnime, permitirAnime, obterCapa, type AnimeJikan, type TextosExistentes } from "./catalog.ts";

const esquema = z.object({
  action: z.enum(["status", "process", "reset", "start", "resume", "pause"]).default("status"),
  mode: z.enum(["full", "season"]).default("full"),
  page: z.number().int().min(1).max(100000).default(1),
});
const chaveEstado = "jikan_import";
// Agendamento: orçamento de páginas por execução diária, carregado a cada salto.
const esquemaAgendamento = z.object({ depth: z.number().int().min(0).max(60).default(40), workerLease: z.string().uuid().optional() });

/** Agenda o próximo salto do agendamento com pausa, somente se houver páginas restantes. */
function agendarProximo(url: string, token: string, depth: number) {
  const tarefa = (async () => {
    await new Promise(r => setTimeout(r, 3000));
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-token": token }, body: JSON.stringify({ depth }) });
    if (!r.ok) console.error(`Agendamento Jikan [${r.status}]: ${await r.text()}`);
    else await r.text();
  })();
  // @ts-ignore EdgeRuntime existe no ambiente das funções.
  globalThis.EdgeRuntime?.waitUntil?.(tarefa);
}

/** Diferencia indisponibilidade temporária de falhas que exigem intervenção administrativa. */
class ErroImportacao extends Error {
  constructor(mensagem: string, readonly temporario: boolean, readonly esperaMs = 0, readonly status = 502) {
    super(mensagem);
  }
}

/** Cliente privado usado só para gravar os logs de diagnóstico (criado sob demanda). */
let bancoLogs: SupabaseClient | null = null;
function obterBancoLogs() {
  const url = Deno.env.get("SUPABASE_URL"), chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!bancoLogs && url && chave) bancoLogs = createClient(url, chave);
  return bancoLogs;
}

/** Classifica o evento em resultado: sucesso, aviso, erro ou info. */
function classificarResultado(evento: string, detalhes: Record<string, unknown>) {
  if (evento === "pagina_concluida") return "sucesso";
  if (evento === "consulta_respondida") return Number(detalhes.status) < 400 ? "sucesso" : "erro";
  if (evento === "fallback_acionado" || evento === "falha_capa") return "aviso";
  if (evento === "consulta_iniciada") return "info";
  return "erro";
}

/** Registra eventos de diagnóstico nos registros da função e na tabela consultável pelo painel. */
function diagnostico(evento: string, detalhes: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fonte: "import-jikan", evento, ...detalhes }));
  const base = typeof detalhes.base === "string" ? detalhes.base : typeof detalhes.de === "string" ? detalhes.de : null;
  const ehPublica = base ? base.includes("api.tenrai.org") : null;
  // Grava sem bloquear a importação; falhas de log nunca interrompem o fluxo.
  obterBancoLogs()?.from("jikan_import_logs").insert({
    evento,
    base: base === null ? null : ehPublica ? "publica" : "propria",
    resultado: classificarResultado(evento, detalhes),
    pagina: typeof detalhes.pagina === "number" ? detalhes.pagina : null,
    modo: typeof detalhes.modo === "string" ? detalhes.modo : null,
    detalhes,
  }).then(({ error }) => { if (error) console.error("falha ao gravar log", error.message); });
}

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
  const banco = createClient(urlBackend, chavePrivada);
  const tokenAgendamento = req.headers.get("x-cron-token");
  let idUsuario: string | null = null;
  let profundidade = 0;
  let workerLease: string | null = null;
  let action: "status" | "process" | "reset" | "start" | "resume" | "pause", mode: "full" | "season", page: number;
  if (tokenAgendamento) {
    // Agendamento diário: compara o hash da senha exclusiva guardada no banco.
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenAgendamento)))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { data: registro } = await banco.from("cron_token_hashes").select("token_hash").eq("name", "jikan_daily").maybeSingle();
    if (!registro || registro.token_hash !== hash) return responder({ error: "Agendamento não autorizado" }, 401);
    const corpo = esquemaAgendamento.safeParse(await req.json().catch(() => ({})));
    if (!corpo.success) return responder({ error: "Parâmetros inválidos" }, 400);
    workerLease = corpo.data.workerLease ?? null;
    const { data: execucao, error: erroExecucao } = await banco.from("jikan_server_run").select("*").eq("id", chaveEstado).maybeSingle();
    if (erroExecucao) return responder({ error: "Controle de execução indisponível" }, 503);
    if (workerLease) {
      if (!execucao || execucao.lease_id !== workerLease || execucao.status !== "working" || Date.parse(execucao.lease_until ?? "") <= Date.now()) return responder({ error: "Concessão expirada", retryable: true }, 409);
      idUsuario = execucao.requested_by;
    } else if (execucao && (execucao.pause_requested || ["queued", "working", "waiting", "paused"].includes(execucao.status))) {
      // O cron diário não assume nem reinicia trabalho controlado pelo administrador.
      return responder({ success: true, skipped: true, reason: "Execução administrativa autônoma tem prioridade" });
    }
    // Continua a varredura completa a partir da última página salva.
    const { data: atual } = await banco.from("sync_state").select("current_page,mode,max_page").eq("id", chaveEstado).maybeSingle();
    const ultima = atual?.mode === "full" ? atual.current_page ?? 0 : 0;
    action = "process"; mode = workerLease && execucao ? execucao.mode : "full";
    page = atual?.max_page && ultima >= atual.max_page ? 1 : Math.max(2, ultima + 1);
    if (ultima === 0) page = 1;
    if (workerLease) page = atual?.mode === mode ? (atual.current_page ?? 0) + 1 : 1;
    profundidade = corpo.data.depth;
  } else {
    const authorization = req.headers.get("Authorization") ?? "";
    const clienteUsuario = createClient(urlBackend, chavePublica, { global: { headers: { Authorization: authorization } } });
    const { data: usuario, error: erroUsuario } = await clienteUsuario.auth.getUser();
    if (erroUsuario || !usuario.user) return responder({ error: "Entre na sua conta" }, 401);
    const { data: administrador, error: erroPapel } = await clienteUsuario.rpc("has_role", { _user_id: usuario.user.id, _role: "admin" });
    if (erroPapel || !administrador) return responder({ error: "Acesso restrito a administradores" }, 403);
    const entrada = esquema.safeParse(await req.json().catch(() => null));
    if (!entrada.success) return responder({ error: "Parâmetros inválidos", details: entrada.error.flatten() }, 400);
    ({ action, mode, page } = entrada.data);
    idUsuario = usuario.user.id;
  }
  if (action === "start" || action === "resume" || action === "pause") {
    const { data, error } = await banco.rpc("jikan_server_command", { p_action: action, p_mode: mode, p_user_id: idUsuario });
    return error ? responder({ error: "Não foi possível alterar a execução", retryable: true }, 503) : responder(data);
  }
  let possuiBloqueio = false;
  let concessao = "";
  // Marca o início para medir a duração de cada página no histórico.
  const inicio = Date.now();
  /** Registra a execução no histórico sem interromper a importação em caso de falha. */
  const registrarHistorico = async (dados: Record<string, unknown>) => {
    const { error } = await banco.from("jikan_import_history").insert({ mode, page, started_at: new Date(inicio).toISOString(), finished_at: new Date().toISOString(), duration_ms: Date.now() - inicio, triggered_by: idUsuario, ...dados });
    if (error) console.error("histórico Jikan", error);
  };
  try {
    // Garante uma linha inicial sem substituir progresso de outra execução.
    const { error: erroInicial } = await banco.from("sync_state").upsert({ id: chaveEstado, mode: "full", current_page: 0, is_running: false }, { onConflict: "id", ignoreDuplicates: true });
    if (erroInicial) throw erroInicial;
    const { data: estado, error: erroEstado } = await banco.from("sync_state").select("*").eq("id", chaveEstado).single();
    if (erroEstado) throw erroEstado;
    const agora = new Date().toISOString();
    const ocupado = estado.is_running && Date.now() - new Date(estado.updated_at).getTime() < 300000;
    const { data: execucao, error: erroExecucao } = await banco.from("jikan_server_run").select("mode,status,pause_requested,attempt,next_attempt_at,last_error,started_at,finished_at").eq("id", chaveEstado).maybeSingle();
    if (erroExecucao) throw erroExecucao;
    if (action === "status") return responder({ success: true, data: { ...estado, is_running: ocupado, server_run: execucao } });
    if (!workerLease && execucao && (["queued", "working", "waiting"].includes(execucao.status) || (execucao.status === "paused" && ocupado))) return responder({ error: "Execução autônoma ativa; use os controles de pausa e retomada.", retryable: false }, 409);
    if (ocupado) return responder({ error: "Uma página já está sendo processada; aguardando sua conclusão.", retryable: true, retryAfterMs: Math.max(5000, 300000 - (Date.now() - new Date(estado.updated_at).getTime())) }, 409);
    if (action === "reset") {
      const { data: reinicio, error } = await banco.rpc("jikan_reset_checkpoint", { p_updated_at: estado.updated_at });
      if (error) throw error;
      if (!reinicio?.length) return responder({ error: "Outra execução alterou o progresso; tente novamente.", retryable: true }, 409);
      return responder({ success: true });
    }
    // Compare-and-swap impede importações simultâneas em abas diferentes.
    const { data: bloqueio, error: erroBloqueio } = await banco.rpc("jikan_acquire_page", { p_mode: mode, p_page: page, p_updated_at: estado.updated_at, p_worker_lease: workerLease });
    if (erroBloqueio) throw erroBloqueio;
    if (!bloqueio?.length) return responder({ error: "Outra importação iniciou; aguardando a liberação.", retryable: true, retryAfterMs: 5000 }, 409);
    possuiBloqueio = true;
    // Usa o valor retornado pelo banco: o gatilho atualiza o horário com precisão própria.
    concessao = bloqueio[0].updated_at;
    // Intervalo conservador: uma página a cada 1,2 s, abaixo de 60 consultas/minuto.
    const intervalo = Date.now() - new Date(estado.updated_at).getTime();
    if (intervalo < 1200) await new Promise(resolve => setTimeout(resolve, 1200 - intervalo));
    const caminho = mode === "season" ? "/seasons/now" : "/anime";
    // Monta a URL de consulta para uma base do Jikan (própria ou pública).
    const montarEndereco = (base: string) => {
      const endereco = new URL(`${base.replace(/\/+$/, "")}${caminho}`);
      endereco.searchParams.set("page", String(page));
      endereco.searchParams.set("limit", "25");
      if (mode === "full") { endereco.searchParams.set("order_by", "mal_id"); endereco.searchParams.set("sort", "asc"); }
      return endereco;
    };
    const BASE_PUBLICA = "https://api.tenrai.org/v1";
    const basePropria = (Deno.env.get("JIKAN_BASE_URL") ?? "").trim();
    // Só aceita instância própria em HTTPS válido; caso contrário usa apenas a pública.
    const bases = /^https:\/\/[^\s]+$/i.test(basePropria) && basePropria.replace(/\/+$/, "") !== BASE_PUBLICA ? [basePropria, BASE_PUBLICA] : [BASE_PUBLICA];
    let resposta: Response | null = null;
    diagnostico("consulta_iniciada", { pagina: page, modo: mode, bases: bases.length });
    // Tenta a instância própria primeiro; em falha de rede ou erro 5xx/429, recorre à API pública.
    for (const [indice, base] of bases.entries()) {
      const ultima = indice === bases.length - 1;
      const inicioConsulta = Date.now();
      try {
        const r = await fetch(montarEndereco(base), { signal: AbortSignal.timeout(ultima ? 20000 : 12000) });
        diagnostico("consulta_respondida", { base, status: r.status, duracao_ms: Date.now() - inicioConsulta, pagina: page });
        if (!ultima && (r.status >= 500 || r.status === 429 || r.status === 408)) { diagnostico("fallback_acionado", { motivo: `status_${r.status}`, de: base, para: BASE_PUBLICA, pagina: page }); await r.body?.cancel(); continue; }
        resposta = r; break;
      } catch (falha) {
        const nome = falha instanceof Error ? falha.name : "desconhecido";
        // Timeout e falha de rede da instância própria acionam a reserva pública.
        diagnostico(nome === "TimeoutError" || nome === "AbortError" ? "timeout_consulta" : "erro_rede_consulta", { base, erro: nome, duracao_ms: Date.now() - inicioConsulta, pagina: page });
        if (!ultima) { diagnostico("fallback_acionado", { motivo: nome === "TimeoutError" || nome === "AbortError" ? "timeout" : "erro_rede", de: base, para: BASE_PUBLICA, pagina: page }); continue; }
      }
    }
    if (!resposta) { diagnostico("todas_bases_falharam", { pagina: page, modo: mode }); throw new ErroImportacao("O Jikan não respondeu. A importação será retomada automaticamente.", true); }
    if (!resposta.ok) {
      const detalhes = await resposta.text();
      console.error(`Jikan [${resposta.status}]: ${detalhes}`);
      diagnostico("erro_http_jikan", { status: resposta.status, pagina: page, retry_after: resposta.headers.get("Retry-After") });
      const cabecalho = resposta.headers.get("Retry-After");
      const segundos = cabecalho ? Number(cabecalho) : NaN;
      const espera = cabecalho ? (Number.isFinite(segundos) ? segundos * 1000 : Date.parse(cabecalho) - Date.now()) : 0;
      const temporario = resposta.status === 408 || resposta.status === 429 || resposta.status >= 500;
      throw new ErroImportacao(`Jikan indisponível (${resposta.status}). ${resposta.status === 429 ? "Limite de consultas atingido." : temporario ? "Aguardando nova tentativa." : "Verifique a origem antes de retomar."}`, temporario, Math.max(resposta.status === 429 ? 60000 : 0, Number.isFinite(espera) ? espera : 0), temporario ? 503 : 422);
    }
    const resultado = await resposta.json().catch(() => null);
    if (!Array.isArray(resultado?.data) || !Number.isInteger(resultado?.pagination?.last_visible_page)) throw new ErroImportacao("Resposta inválida do Jikan; aguardando nova tentativa.", true);
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
        } catch (falhaCapa) { falhasCapas++; diagnostico("falha_capa", { mal_id: anime.mal_id, erro: falhaCapa instanceof Error ? falhaCapa.message : "desconhecido" }); /* Mantém URL original e a capa local anterior para posterior sincronização. */ }
      }));
    }
    const continuar = resultado.pagination.has_next_page === true;
    const total = (page === 1 ? 0 : estado.total_synced ?? 0) + novos + atualizados;
    const { data: confirmado, error: erroFinal } = await banco.from("sync_state").update({ mode, current_page: page, max_page: resultado.pagination.last_visible_page, total_synced: total, is_running: false, last_error: null, last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", chaveEstado).eq("updated_at", concessao).select("id");
    if (erroFinal) throw erroFinal;
    if (!confirmado?.length) throw new ErroImportacao("A execução anterior expirou; consultando o progresso salvo.", true, 5000, 409);
    // Gera sugestões de tradução para os animes desta página; falhas não interrompem a importação.
    let traducoes = 0, erroTraducao: string | null = null;
    try {
      const { data: candidatos } = ids.length ? await banco.from("anime_catalog").select("mal_id,title,synopsis,synopsis_pt").in("mal_id", ids) : { data: [] };
      traducoes = await gerarSugestoes(banco, candidatos ?? [], "import");
    } catch (e) { erroTraducao = e instanceof Error ? e.message : "Falha na tradução"; console.error("tradução automática", e); diagnostico("erro_traducao", { pagina: page, erro: erroTraducao }); }
    await registrarHistorico({ status: "success", created_count: novos, updated_count: atualizados, covers_count: capas, cover_failures: falhasCapas });
    diagnostico("pagina_concluida", { pagina: page, modo: mode, novos, atualizados, capas, falhasCapas, traducoes, duracao_ms: Date.now() - inicio });
    // Erros pendentes são resolvidos quando uma página volta a ser concluída.
    const { data: pendentes } = await banco.from("jikan_import_history").select("id,finished_at").eq("status", "error").eq("mode", mode).eq("page", page).is("resolved_at", null);
    for (const p of pendentes ?? []) {
      await banco.from("jikan_import_history").update({ resolved_at: new Date().toISOString(), resolved_after_ms: Date.now() - new Date(p.finished_at).getTime() }).eq("id", p.id);
    }
    if (tokenAgendamento && !workerLease && continuar && profundidade > 1) agendarProximo(`${urlBackend}/functions/v1/import-jikan`, tokenAgendamento, profundidade - 1);
    return responder({ success: true, continue: continuar, page, totalPages: resultado.pagination.last_visible_page, processed: total, stats: { novos, atualizados, capas, falhasCapas, traducoes, erroTraducao, filtrados: resultado.data.length - animes.length } });
  } catch (erro) {
    const eTimeout = erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError");
    const mensagem = eTimeout
      ? "O Jikan demorou demais para responder. Aguarde e retome a importação; nenhum progresso será perdido."
      : erro instanceof Error ? erro.message : "Falha na importação";
    // Registra o erro com o tipo para distinguir timeout de falhas definitivas nos registros.
    diagnostico(eTimeout ? "timeout_importacao" : "erro_importacao", { pagina: page, modo: mode, erro: mensagem, tipo: erro instanceof Error ? erro.name : "desconhecido", duracao_ms: Date.now() - inicio });
    if (possuiBloqueio) await registrarHistorico({ status: "error", error_message: mensagem, retryable: erro instanceof ErroImportacao ? erro.temporario : true });
    if (possuiBloqueio) await banco.from("sync_state").update({ is_running: false, last_error: mensagem, updated_at: new Date().toISOString() }).eq("id", chaveEstado).eq("updated_at", concessao);
    // Falhas temporárias (Jikan fora do ar, timeout) voltam com status 200 e success:false,
    // para o painel tratar como "retomar depois" sem que o app considere um erro fatal de execução.
    const temporario = erro instanceof ErroImportacao ? erro.temporario : erro instanceof Error && ["TimeoutError", "AbortError"].includes(erro.name);
    return responder({ success: false, error: mensagem, retryable: temporario, retryAfterMs: erro instanceof ErroImportacao ? erro.esperaMs : 0 }, temporario ? 200 : erro instanceof ErroImportacao ? erro.status : 500);
  }
});
