// Importação do Kitsu (sucessor do Hummingbird) — separada da importação do Jikan.
// Modos:
//   enrich   → completa dados faltantes dos animes já catalogados (nunca sobrescreve textos/notas
//              preenchidos pelo Jikan) e salva capas reserva quando o anime não tem nenhuma imagem.
//   discover → descobre animes novos (mais populares) e os importa somente quando têm vínculo
//              com o MAL pelo serviço de mapeamento, mantendo o catálogo compatível com o resto do app.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { z } from "npm:zod@3";
import { gerarSugestoes } from "../_shared/deepl.ts";
import { mapearAnimeKitsu, permitirAnimeKitsu, type AnimeKitsu, type TextosExistentesKitsu } from "./kitsu.ts";

const esquema = z.object({
  action: z.enum(["status", "process", "reset"]).default("status"),
  mode: z.enum(["enrich", "discover"]).default("enrich"),
  page: z.number().int().min(1).max(100000).default(1),
});
const chaveEstado = "kitsu_import";
// Endereços das fontes: mapeamento de IDs (ARM) e API aberta do Kitsu.
const ARM_BASE = "https://relations.yuna.moe/api/ids";
const KITSU_BASE = "https://kitsu.app/api/edge/anime";
// Tamanho da página processada por chamada e limite de downloads de capa.
const TAMANHO_PAGINA = 20;
const MAX_CAPAS_POR_PAGINA = 8;

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
  if (evento === "sem_mapeamento" || evento === "falha_capa") return "aviso";
  if (evento === "consulta_iniciada") return "info";
  return "erro";
}

/** Registra eventos de diagnóstico na tabela consultável pelo painel de logs. */
function diagnostico(evento: string, detalhes: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fonte: "import-kitsu", evento, ...detalhes }));
  // Falhas de log nunca interrompem o fluxo da importação.
  obterBancoLogs()?.from("jikan_import_logs").insert({
    evento,
    base: "kitsu",
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

/** Executa tarefas em pequenos grupos limitando simultaneidade das fontes externas. */
async function emGrupos<T, R>(itens: T[], tamanho: number, tarefa: (item: T) => Promise<R>) {
  const resultados: R[] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    resultados.push(...await Promise.all(itens.slice(i, i + tamanho).map(tarefa)));
  }
  return resultados;
}

/** Consulta o serviço de mapeamento para traduzir IDs entre MAL e Kitsu; null quando não há vínculo. */
async function mapearId(fonte: "myanimelist" | "kitsu", id: number): Promise<number | null> {
  const resposta = await fetch(`${ARM_BASE}?source=${fonte}&id=${id}`, { signal: AbortSignal.timeout(10000) });
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new ErroImportacao(`O serviço de mapeamento não respondeu (${resposta.status}). A importação será retomada automaticamente.`, true, 30000);
  const dados = await resposta.json().catch(() => null);
  if (!dados) return null;
  const alvo = fonte === "myanimelist" ? "kitsu" : "myanimelist";
  const valor = Number(dados[alvo]);
  return Number.isInteger(valor) && valor > 0 ? valor : null;
}

/** Busca no Kitsu os animes por uma lista de IDs do Kitsu; devolve mapa por id. */
async function buscarKitsu(ids: number[]): Promise<Map<number, AnimeKitsu>> {
  const mapa = new Map<number, AnimeKitsu>();
  // Consulta em grupos de 10, aproveitando o filtro em lote do Kitsu.
  for (let i = 0; i < ids.length; i += 10) {
    const lista = ids.slice(i, i + 10).join(",");
    const url = `${KITSU_BASE}?filter%5Bid%5D=${lista}&page%5Blimit%5D=10`;
    diagnostico("consulta_iniciada", { fonte: "kitsu", ids: lista });
    const resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
    diagnostico("consulta_respondida", { base: "kitsu", status: resposta.status });
    if (resposta.status === 429 || resposta.status >= 500) throw new ErroImportacao(`O Kitsu está ocupado (${resposta.status}). A importação será retomada automaticamente.`, true, resposta.status === 429 ? 60000 : 15000);
    if (!resposta.ok) throw new ErroImportacao(`Kitsu indisponível (${resposta.status}).`, false, 0, 422);
    const resultado = await resposta.json().catch(() => null);
    if (!Array.isArray(resultado?.data)) throw new ErroImportacao("Resposta inválida do Kitsu; aguardando nova tentativa.", true);
    for (const item of resultado.data as AnimeKitsu[]) {
      const id = Number(item.id);
      if (Number.isInteger(id)) mapa.set(id, item);
    }
  }
  return mapa;
}

/** Baixa a capa e grava no balde de imagens local; devolve a URL pública ou lança falha tratada acima. */
async function salvarCapa(banco: SupabaseClient, malId: number, capa: string) {
  const imagem = await fetch(capa, { signal: AbortSignal.timeout(7000) });
  if (!imagem.ok) { await imagem.text(); throw new Error("Capa indisponível"); }
  const tipo = imagem.headers.get("content-type")?.split(";")[0] ?? "";
  const bytes = await imagem.arrayBuffer();
  if (!["image/jpeg", "image/png", "image/webp"].includes(tipo) || bytes.byteLength > 5000000) throw new Error("Formato de capa inválido");
  const extensao = tipo === "image/webp" ? "webp" : tipo === "image/png" ? "png" : "jpg";
  const arquivo = `covers/${malId}.${extensao}`;
  const { error: erroUpload } = await banco.storage.from("anime-images").upload(arquivo, bytes, { contentType: tipo, upsert: true });
  if (erroUpload) throw erroUpload;
  const { data: publica } = banco.storage.from("anime-images").getPublicUrl(arquivo);
  return publica.publicUrl;
}

/** Identifica quais dados o anime ainda precisa (completar apenas o que falta). */
function temPendencia(linha: Record<string, unknown>): boolean {
  const nulo = (v: unknown) => v === null || v === undefined;
  return nulo(linha.synopsis_pt) || nulo(linha.synopsis) || nulo(linha.score) || nulo(linha.episodes)
    || nulo(linha.year) || (nulo(linha.image_url) && nulo(linha.local_image_url));
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
  let action: "status" | "process" | "reset", mode: "enrich" | "discover", page: number;
  if (tokenAgendamento) {
    // Agendamento: compara o hash da senha exclusiva guardada no banco (nome separado do Jikan).
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenAgendamento)))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { data: registro } = await banco.from("cron_token_hashes").select("token_hash").eq("name", "kitsu_daily").maybeSingle();
    if (!registro || registro.token_hash !== hash) return responder({ error: "Agendamento não autorizado" }, 401);
    action = "process"; mode = "enrich";
    // Continua a varredura a partir da última página salva.
    const { data: atual } = await banco.from("sync_state").select("current_page,mode,max_page").eq("id", chaveEstado).maybeSingle();
    const ultima = atual?.mode === "enrich" ? atual.current_page ?? 0 : 0;
    page = atual?.max_page && ultima >= atual.max_page ? 1 : Math.max(2, ultima + 1);
    if (ultima === 0) page = 1;
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
  let possuiBloqueio = false;
  let concessao = "";
  const inicio = Date.now();
  /** Registra a execução no histórico sem interromper a importação em caso de falha. */
  const registrarHistorico = async (dados: Record<string, unknown>) => {
    const { error } = await banco.from("kitsu_import_history").insert({ mode, page, started_at: new Date(inicio).toISOString(), finished_at: new Date().toISOString(), duration_ms: Date.now() - inicio, triggered_by: idUsuario, ...dados });
    if (error) console.error("histórico Kitsu", error);
  };
  try {
    // Garante uma linha inicial sem substituir progresso de outra execução.
    const { error: erroInicial } = await banco.from("sync_state").upsert({ id: chaveEstado, mode: "enrich", current_page: 0, is_running: false }, { onConflict: "id", ignoreDuplicates: true });
    if (erroInicial) throw erroInicial;
    const { data: estado, error: erroEstado } = await banco.from("sync_state").select("*").eq("id", chaveEstado).single();
    if (erroEstado) throw erroEstado;
    const agora = new Date().toISOString();
    const ocupado = estado.is_running && Date.now() - new Date(estado.updated_at).getTime() < 120000;
    if (action === "status") return responder({ success: true, data: { ...estado, is_running: ocupado } });
    if (ocupado) return responder({ error: "Uma página já está sendo processada; aguardando sua conclusão.", retryable: true, retryAfterMs: Math.max(5000, 120000 - (Date.now() - new Date(estado.updated_at).getTime())) }, 409);
    if (action === "reset") {
      const { data: reinicio, error } = await banco.from("sync_state").update({ current_page: 0, total_synced: 0, max_page: null, is_running: false, last_error: null, updated_at: agora }).eq("id", chaveEstado).eq("updated_at", estado.updated_at).select("id");
      if (error) throw error;
      if (!reinicio?.length) return responder({ error: "Outra execução alterou o progresso; tente novamente.", retryable: true }, 409);
      return responder({ success: true });
    }
    // Compare-and-swap impede importações simultâneas em abas diferentes.
    const reiniciando = page === 1 || estado.mode !== mode;
    const { data: bloqueio, error: erroBloqueio } = await banco.from("sync_state").update({ is_running: true, mode, ...(reiniciando ? { current_page: 0, total_synced: 0, max_page: null } : {}), updated_at: agora }).eq("id", chaveEstado).eq("updated_at", estado.updated_at).select("id,updated_at");
    if (erroBloqueio) throw erroBloqueio;
    if (!bloqueio?.length) return responder({ error: "Outra importação iniciou; aguardando a liberação.", retryable: true, retryAfterMs: 5000 }, 409);
    possuiBloqueio = true;
    concessao = bloqueio[0].updated_at;
    // Intervalo conservador entre chamadas para respeitar as fontes externas.
    const intervalo = Date.now() - new Date(estado.updated_at).getTime();
    if (intervalo < 1200) await new Promise(resolve => setTimeout(resolve, 1200 - intervalo));

    let novos = 0, atualizados = 0, capas = 0, falhasCapas = 0, semMapeamento = 0, semPendencias = 0, traduzidos = 0, totalPaginas: number | null = null;
    // Lista de animes tocados nesta página, gravada em kitsu_import_items para o painel exibir.
    const itens: { kitsu_id: number; mal_id: number; title: string | null; acao: "criado" | "completado"; campos: string[]; capa: boolean }[] = [];
    if (mode === "enrich") {
      // Percorre o catálogo em ordem de MAL ID, página por página, completando o que falta.
      const offset = (page - 1) * TAMANHO_PAGINA;
      const { data: linhas, error: erroLinhas } = await banco.from("anime_catalog")
        .select("mal_id,title,title_english,title_japanese,synopsis,synopsis_pt,score,scored_by,rank,popularity,members,episodes,status,type,rating,year,season,image_url,local_image_url")
        .order("mal_id").range(offset, offset + TAMANHO_PAGINA - 1);
      if (erroLinhas) throw erroLinhas;
      const pendentes = (linhas ?? []).filter(temPendencia);
      semPendencias = (linhas ?? []).length - pendentes.length;
      // Mapeia cada MAL ID para o Kitsu pelo serviço externo.
      const vinculos = await emGrupos(pendentes, 5, async (linha) => ({ mal_id: linha.mal_id as number, kitsu: await mapearId("myanimelist", linha.mal_id as number) }));
      for (const v of vinculos) if (!v.kitsu) { semMapeamento++; diagnostico("sem_mapeamento", { mal_id: v.mal_id, modo: mode, pagina: page }); }
      const comVinculo = vinculos.filter((v): v is { mal_id: number; kitsu: number } => typeof v.kitsu === "number");
      const animes = await buscarKitsu(comVinculo.map(v => v.kitsu));
      // Preenche somente campos vazios de cada anime; capas apenas para quem não tem nenhuma imagem.
      let baixadas = 0;
      const preenchidos: number[] = [];
      for (const v of comVinculo) {
        const anime = animes.get(v.kitsu);
        const linha = pendentes.find(p => p.mal_id === v.mal_id);
        if (!anime || !permitirAnimeKitsu(anime) || !linha) continue;
        const registro = mapearAnimeKitsu(anime, linha as unknown as TextosExistentesKitsu);
        const capa = (registro.image_url as string | null) ?? null;
        if (Object.keys(registro).length === 0) { semPendencias++; continue; }
        const { error: erroSalvar } = await banco.from("anime_catalog").update(registro).eq("mal_id", v.mal_id);
        // Falha em um anime não derruba a página: registra o motivo e segue para o próximo.
        if (erroSalvar) { diagnostico("erro_salvar_anime", { mal_id: v.mal_id, pagina: page, modo: mode, erro: erroSalvar.message, codigo: erroSalvar.code, campos: Object.keys(registro) }); continue; }
        atualizados++;
        preenchidos.push(v.mal_id);
        // Registra o anime completado com os campos que a importação preencheu.
        const item = { kitsu_id: v.kitsu, mal_id: v.mal_id, title: typeof linha.title === "string" ? linha.title : null, acao: "completado" as const, campos: Object.keys(registro), capa: false };
        itens.push(item);
        if (capa && baixadas < MAX_CAPAS_POR_PAGINA) {
          baixadas++;
          try {
            const local = await salvarCapa(banco, v.mal_id, capa);
            const { error: erroCapa } = await banco.from("anime_catalog").update({ local_image_url: local }).eq("mal_id", v.mal_id);
            if (erroCapa) throw erroCapa;
            capas++;
            item.capa = true;
          } catch (falhaCapa) { falhasCapas++; diagnostico("falha_capa", { mal_id: v.mal_id, erro: falhaCapa instanceof Error ? falhaCapa.message : "desconhecido", pagina: page }); }
        }
      }
      // Sugestões de tradução para as sinopses recém-preenchidas; falhas não interrompem.
      try {
        const { data: lidas } = preenchidos.length
          ? await banco.from("anime_catalog").select("mal_id,title,synopsis,synopsis_pt").in("mal_id", preenchidos)
          : { data: [] };
        traduzidos = await gerarSugestoes(banco, (lidas ?? []) as { mal_id: number; title: string; synopsis: string | null; synopsis_pt: string | null }[], "import");
      } catch (e) { diagnostico("erro_traducao", { pagina: page, erro: e instanceof Error ? e.message : "Falha na tradução", modo: mode }); }
    } else {
      // Descobre animes novos entre os mais populares do Kitsu (reserva quando o Jikan não funciona).
      const url = `${KITSU_BASE}?sort=-userCount&filter%5Bsubtype%5D=TV,movie,OVA,ONA,special&page%5Blimit%5D=${TAMANHO_PAGINA}&page%5Boffset%5D=${(page - 1) * TAMANHO_PAGINA}`;
      diagnostico("consulta_iniciada", { fonte: "kitsu", pagina: page, modo: mode });
      const resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
      diagnostico("consulta_respondida", { base: "kitsu", status: resposta.status, pagina: page, modo: mode });
      if (resposta.status === 429 || resposta.status >= 500) throw new ErroImportacao(`O Kitsu está ocupado (${resposta.status}). A importação será retomada automaticamente.`, true, resposta.status === 429 ? 60000 : 15000);
      if (!resposta.ok) throw new ErroImportacao(`Kitsu indisponível (${resposta.status}).`, false, 0, 422);
      const resultado = await resposta.json().catch(() => null);
      if (!Array.isArray(resultado?.data)) throw new ErroImportacao("Resposta inválida do Kitsu; aguardando nova tentativa.", true);
      const total = Number(resultado?.meta?.count);
      if (Number.isInteger(total) && total > 0) totalPaginas = Math.ceil(total / TAMANHO_PAGINA);
      const candidatos = (resultado.data as AnimeKitsu[]).filter(permitirAnimeKitsu);
      // Mapeia cada id do Kitsu para o MAL; sem vínculo, o anime não pode entrar no catálogo.
      const vinculos = await emGrupos(candidatos, 5, async (anime) => ({ anime, mal_id: await mapearId("kitsu", Number(anime.id)) }));
      for (const v of vinculos) if (!v.mal_id) { semMapeamento++; diagnostico("sem_mapeamento", { kitsu_id: v.anime.id, modo: mode, pagina: page }); }
      const idsValidos = vinculos.map(v => v.mal_id).filter(Number.isInteger) as number[];
      const { data: existentes } = idsValidos.length ? await banco.from("anime_catalog").select("mal_id").in("mal_id", idsValidos) : { data: [] };
      const jaCatalogados = new Set((existentes ?? []).map(e => e.mal_id));
      let baixadas = 0;
      const criados: { mal_id: number; anime: AnimeKitsu }[] = [];
      for (const v of vinculos) {
        if (!v.mal_id || jaCatalogados.has(v.mal_id)) continue;
        const registro = { mal_id: v.mal_id, ...mapearAnimeKitsu(v.anime) };
        const capa = (registro.image_url as string | null) ?? null;
        const { error: erroSalvar } = await banco.from("anime_catalog").upsert(registro, { onConflict: "mal_id", ignoreDuplicates: true });
        // Falha em um anime não derruba a página: registra o motivo e segue para o próximo.
        if (erroSalvar) { diagnostico("erro_salvar_anime", { mal_id: v.mal_id, pagina: page, modo: mode, erro: erroSalvar.message, codigo: erroSalvar.code }); continue; }
        novos++;
        criados.push({ mal_id: v.mal_id, anime: v.anime });
        // Registra o anime recém-criado com os campos gravados na primeira importação.
        const item = { kitsu_id: Number(v.anime.id), mal_id: v.mal_id, title: v.anime.attributes.canonicalTitle ?? null, acao: "criado" as const, campos: Object.keys(registro), capa: false };
        itens.push(item);
        if (capa && baixadas < MAX_CAPAS_POR_PAGINA) {
          baixadas++;
          try {
            const local = await salvarCapa(banco, v.mal_id, capa);
            const { error: erroCapa } = await banco.from("anime_catalog").update({ local_image_url: local }).eq("mal_id", v.mal_id);
            if (erroCapa) throw erroCapa;
            capas++;
            item.capa = true;
          } catch (falhaCapa) { falhasCapas++; diagnostico("falha_capa", { mal_id: v.mal_id, erro: falhaCapa instanceof Error ? falhaCapa.message : "desconhecido", pagina: page }); }
        }
      }
      // Sugestões de tradução para as sinopses dos animes recém-criados.
      try {
        const candidatosTraducao = criados.map(c => ({ mal_id: c.mal_id, title: c.anime.attributes.canonicalTitle ?? "", synopsis: c.anime.attributes.synopsis ?? null, synopsis_pt: null as string | null }));
        traduzidos = await gerarSugestoes(banco, candidatosTraducao, "import");
      } catch (e) { diagnostico("erro_traducao", { pagina: page, erro: e instanceof Error ? e.message : "Falha na tradução", modo: mode }); }
    }
    // Total de páginas: no enrich usa o tamanho do catálogo; no discover, o total informado pelo Kitsu.
    if (totalPaginas === null) {
      if (page === 1) {
        const { count } = await banco.from("anime_catalog").select("*", { count: "exact", head: true });
        totalPaginas = count ? Math.ceil(count / TAMANHO_PAGINA) : 0;
      } else totalPaginas = estado.max_page ?? page;
    }
    const continuar = page < (totalPaginas ?? page);
    const total = (page === 1 ? 0 : estado.total_synced ?? 0) + novos + atualizados;
    const { data: confirmado, error: erroFinal } = await banco.from("sync_state").update({ mode, current_page: page, max_page: totalPaginas, total_synced: total, is_running: false, last_error: null, last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", chaveEstado).eq("updated_at", concessao).select("id");
    if (erroFinal) throw erroFinal;
    if (!confirmado?.length) throw new ErroImportacao("A execução anterior expirou; consultando o progresso salvo.", true, 5000, 409);
    await registrarHistorico({ status: "success", created_count: novos, updated_count: atualizados, covers_count: capas, cover_failures: falhasCapas });
    // Grava anime por anime para o painel exibir o que a importação tocou; falha de log não interrompe.
    if (itens.length) {
      const { error: erroItens } = await banco.from("kitsu_import_items").insert(itens.map(i => ({ mode, page, kitsu_id: i.kitsu_id, mal_id: i.mal_id, title: i.title, acao: i.acao, campos: i.campos, capa: i.capa })));
      if (erroItens) console.error("itens Kitsu", erroItens);
    }
    diagnostico("pagina_concluida", { pagina: page, modo: mode, novos, atualizados, capas, falhasCapas, traducoes: traduzidos, semMapeamento, semPendencias, duracao_ms: Date.now() - inicio });
    // Erros pendentes são resolvidos quando uma página volta a ser concluída.
    const { data: errosPendentes } = await banco.from("kitsu_import_history").select("id,finished_at").eq("status", "error").eq("mode", mode).eq("page", page).is("resolved_at", null);
    for (const p of errosPendentes ?? []) {
      await banco.from("kitsu_import_history").update({ resolved_at: new Date().toISOString(), resolved_after_ms: Date.now() - new Date(p.finished_at).getTime() }).eq("id", p.id);
    }
    return responder({ success: true, continue: continuar, page, totalPages: totalPaginas, processed: total, stats: { novos, atualizados, capas, falhasCapas, traducoes: traduzidos, semMapeamento, semPendencias } });
  } catch (erro) {
    const eTimeout = erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError");
    // Erros do banco chegam como objetos simples ({ message, code }); extrai a mensagem real.
    const objeto = erro && typeof erro === "object" ? erro as { message?: unknown; code?: unknown } : null;
    const eBanco = !(erro instanceof Error) && typeof objeto?.message === "string";
    const mensagem = eTimeout
      ? "Uma das fontes demorou demais para responder. Aguarde e retome a importação; nenhum progresso será perdido."
      : erro instanceof Error ? erro.message : eBanco ? `Erro no banco: ${objeto!.message}` : "Falha na importação";
    diagnostico(eTimeout ? "timeout_importacao" : "erro_importacao", { pagina: page, modo: mode, erro: mensagem, tipo: erro instanceof Error ? erro.name : eBanco ? `banco ${String(objeto!.code ?? "")}` : "desconhecido", duracao_ms: Date.now() - inicio });
    if (possuiBloqueio) await registrarHistorico({ status: "error", error_message: mensagem, retryable: erro instanceof ErroImportacao ? erro.temporario : true });
    if (possuiBloqueio) await banco.from("sync_state").update({ is_running: false, last_error: mensagem, updated_at: new Date().toISOString() }).eq("id", chaveEstado).eq("updated_at", concessao);
    // Falhas temporárias voltam com status 200 e success:false, para o painel tratar como "retomar depois".
    const temporario = erro instanceof ErroImportacao ? erro.temporario : eTimeout;
    return responder({ success: false, error: mensagem, retryable: temporario, retryAfterMs: erro instanceof ErroImportacao ? erro.esperaMs : 0 }, temporario ? 200 : erro instanceof ErroImportacao ? erro.status : 500);
  }
});
