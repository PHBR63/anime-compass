/**
 * Edge Function: import-catalog
 * 
 * Importa animes de uma API externa para popular o catálogo local.
 * Suporta importação completa paginada (full) e sincronização incremental (delta).
 * 
 * Endpoints:
 * - POST: Inicia/continua importação (mode=full ou mode=delta, page opcional)
 * - GET: Retorna status da importação atual
 * - GET ?action=reset: Reseta estado travado
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers CORS para requisições web
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URL da API externa (fonte de dados)
const EXTERNAL_API_URL = "https://xhyairbedwqezegopjan.supabase.co/functions/v1/anime-api";

// Configurações de importação
const PAGE_SIZE = 500; // Animes por página da API externa
const BATCH_SIZE = 100; // Registros por batch de upsert no banco
const STALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos sem atualização = travado

/**
 * Interface para anime da API externa
 */
interface ExternalAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  synopsis_en?: string;
  synopsis_pt?: string;
  synopsis?: string;
  image_url?: string;
  local_image_url?: string;
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  episodes?: number;
  status?: string;
  year?: number;
  season?: string;
  type?: string;
  rating?: string;
  genres?: Array<{ mal_id: number; name: string }>;
  studios?: Array<{ mal_id: number; name: string }>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface para paginação da API externa
 */
interface ExternalPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Tipos de anime bloqueados (comerciais, músicas, previews)
const BLOCKED_TYPES = ['Music', 'CM', 'PV'];

/**
 * Verifica se o anime deve ser bloqueado com base no tipo
 */
function isBlockedType(anime: ExternalAnime): boolean {
  return BLOCKED_TYPES.includes(anime.type || '');
}

/**
 * Mapeia anime da API externa para o formato do catálogo local
 */
function mapExternalToLocal(anime: ExternalAnime) {
  return {
    mal_id: anime.mal_id,
    title: anime.title,
    title_english: anime.title_english || null,
    title_japanese: anime.title_japanese || null,
    // Mapeia synopsis_en para synopsis (campo padrão em inglês)
    synopsis: anime.synopsis_en || anime.synopsis || null,
    synopsis_pt: anime.synopsis_pt || null,
    image_url: anime.image_url || null,
    local_image_url: anime.local_image_url || null,
    score: anime.score || null,
    scored_by: anime.scored_by || null,
    rank: anime.rank || null,
    popularity: anime.popularity || null,
    members: anime.members || null,
    episodes: anime.episodes || null,
    status: anime.status || null,
    year: anime.year || null,
    season: anime.season || null,
    type: anime.type || null,
    rating: anime.rating || null,
    genres: anime.genres || [],
    studios: anime.studios || [],
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Processa lote de animes com upsert
 */
async function processBatch(
  supabase: any,
  animes: ExternalAnime[],
  logs: string[]
): Promise<{ inserted: number; errors: number; filtered: number }> {
  const stats = { inserted: 0, errors: 0, filtered: 0 };
  
  // Filtra tipos bloqueados (Music, CM, PV) antes de processar
  const filteredAnimes = animes.filter(anime => {
    if (isBlockedType(anime)) {
      stats.filtered++;
      return false;
    }
    return true;
  });
  
  if (stats.filtered > 0) {
    logs.push(`🚫 Filtrados ${stats.filtered} animes de tipos bloqueados (Music/CM/PV)`);
  }
  
  // Mapeia animes para formato local
  const mappedAnimes = filteredAnimes.map(mapExternalToLocal);
  
  // Divide em sub-batches menores para evitar timeout
  for (let i = 0; i < mappedAnimes.length; i += BATCH_SIZE) {
    const subBatch = mappedAnimes.slice(i, i + BATCH_SIZE);
    
    // Upsert em batch usando mal_id como chave
    const { data, error } = await supabase
      .from("anime_catalog")
      .upsert(subBatch, { 
        onConflict: "mal_id",
        ignoreDuplicates: false 
      })
      .select("mal_id");

    if (error) {
      logs.push(`❌ Erro no sub-batch: ${error.message}`);
      stats.errors += subBatch.length;
    } else {
      stats.inserted += data?.length || 0;
    }
  }
  
  if (stats.inserted > 0) {
    logs.push(`✅ Batch processado: ${stats.inserted} registros`);
  }

  return stats;
}

/**
 * Importação completa paginada do catálogo
 * Processa uma página por vez e retorna continue=true se houver mais páginas
 */
async function fullImportPaginated(
  supabase: any,
  currentPage: number = 1
): Promise<{ 
  success: boolean; 
  continue: boolean;
  progress: {
    page: number;
    totalPages: number;
    processed: number;
    total: number;
    pageSize: number;
  };
  logs: string[];
}> {
  const logs: string[] = [];
  
  logs.push(`📄 Processando página ${currentPage} (${PAGE_SIZE} animes por página)...`);
  
  try {
    // Busca página específica da API externa
    const url = `${EXTERNAL_API_URL}?page=${currentPage}&limit=${PAGE_SIZE}`;
    logs.push(`📡 Buscando: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error("Formato de resposta inválido");
    }
    
    const animes: ExternalAnime[] = data.data;
    const pagination: ExternalPagination = data.pagination;
    
    logs.push(`📦 Recebidos ${animes.length} animes (página ${pagination.page} de ${pagination.total_pages})`);
    
    // Processa o batch desta página
    const batchStats = await processBatch(supabase, animes, logs);
    
    // Calcula progresso total
    const totalProcessed = (currentPage - 1) * PAGE_SIZE + animes.length;
    const hasMore = pagination.has_next;
    
    // Atualiza sync_state com progresso
    await supabase
      .from("sync_state")
      .upsert({
        id: "import",
        mode: "full",
        is_running: hasMore, // Continua rodando se houver mais páginas
        current_page: currentPage,
        max_page: pagination.total_pages,
        total_synced: totalProcessed,
        last_run_at: hasMore ? null : new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    
    if (hasMore) {
      logs.push(`⏳ Página ${currentPage} concluída. Continue para página ${currentPage + 1}...`);
    } else {
      logs.push(`🎉 Importação completa! ${totalProcessed} animes processados em ${pagination.total_pages} páginas`);
    }
    
    return { 
      success: true, 
      continue: hasMore,
      progress: {
        page: currentPage,
        totalPages: pagination.total_pages,
        processed: totalProcessed,
        total: pagination.total,
        pageSize: PAGE_SIZE
      },
      logs 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logs.push(`❌ Erro na página ${currentPage}: ${errorMessage}`);
    
    // Registra erro no sync_state
    await supabase
      .from("sync_state")
      .upsert({
        id: "import",
        mode: "full",
        is_running: false,
        current_page: currentPage,
        last_error: errorMessage,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    
    return { 
      success: false, 
      continue: false,
      progress: {
        page: currentPage,
        totalPages: 0,
        processed: (currentPage - 1) * PAGE_SIZE,
        total: 0,
        pageSize: PAGE_SIZE
      },
      logs 
    };
  }
}

/**
 * Sincronização incremental (delta)
 */
async function deltaSync(
  supabase: any,
  since: string
): Promise<{ success: boolean; stats: Record<string, number>; logs: string[] }> {
  const logs: string[] = [];
  const stats = { total: 0, created: 0, updated: 0, deleted: 0, inserted: 0, errors: 0 };
  
  logs.push(`🔄 Iniciando sincronização delta desde ${since}...`);
  
  try {
    // Busca mudanças desde a última sincronização
    const url = `${EXTERNAL_API_URL}?action=changes&since=${encodeURIComponent(since)}`;
    logs.push(`📡 Buscando de ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || "Erro na API externa");
    }
    
    // A API retorna { data: { created: [], updated: [], deleted_ids: [] }, meta: {...} }
    const data = result.data || {};
    const createdAnimes: ExternalAnime[] = data.created || [];
    const updatedAnimes: ExternalAnime[] = data.updated || [];
    const deletedIds: number[] = data.deleted_ids || [];
    
    stats.created = createdAnimes.length;
    stats.updated = updatedAnimes.length;
    stats.deleted = deletedIds.length;
    stats.total = stats.created + stats.updated + stats.deleted;
    
    logs.push(`📦 Mudanças: ${stats.created} novos, ${stats.updated} atualizados, ${stats.deleted} removidos`);
    
    if (stats.total === 0) {
      logs.push("✅ Nenhuma atualização encontrada");
      
      // Atualiza timestamp mesmo sem mudanças
      await supabase
        .from("sync_state")
        .upsert({
          id: "import",
          mode: "delta",
          is_running: false,
          total_synced: 0,
          last_run_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      
      return { success: true, stats, logs };
    }
    
    // Combina novos e atualizados para processar
    const animesToProcess = [...createdAnimes, ...updatedAnimes];
    
    if (animesToProcess.length > 0) {
      logs.push(`📥 Processando ${animesToProcess.length} animes...`);
      const batchStats = await processBatch(supabase, animesToProcess, logs);
      stats.inserted = batchStats.inserted;
      stats.errors = batchStats.errors;
    }
    
    // Processa deletados (se houver)
    if (deletedIds.length > 0) {
      logs.push(`🗑️ Removendo ${deletedIds.length} animes...`);
      const { error } = await supabase
        .from("anime_catalog")
        .delete()
        .in("mal_id", deletedIds);
      
      if (error) {
        logs.push(`⚠️ Erro ao remover: ${error.message}`);
      } else {
        logs.push(`✅ ${deletedIds.length} animes removidos`);
      }
    }
    
    // Atualiza timestamp
    await supabase
      .from("sync_state")
      .upsert({
        id: "import",
        mode: "delta",
        is_running: false,
        total_synced: stats.inserted,
        last_run_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    
    logs.push(`✅ Delta sync completo! ${stats.inserted} inseridos/atualizados`);
    
    return { success: true, stats, logs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logs.push(`❌ Erro no delta sync: ${errorMessage}`);
    
    // Registra erro no sync_state
    await supabase
      .from("sync_state")
      .upsert({
        id: "import",
        mode: "delta",
        is_running: false,
        last_error: errorMessage,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    
    return { success: false, stats, logs };
  }
}

/**
 * Retorna status da importação
 */
async function getImportStatus(supabase: any) {
  // Busca estado atual
  const { data: syncState } = await supabase
    .from("sync_state")
    .select("*")
    .eq("id", "import")
    .single();
  
  // Busca estatísticas do catálogo
  const { count: totalAnimes } = await supabase
    .from("anime_catalog")
    .select("*", { count: "exact", head: true });
  
  // Verifica se está travado (is_running=true mas sem atualização há mais de 5 min)
  let isStalled = false;
  if (syncState?.is_running && syncState?.updated_at) {
    const lastUpdate = new Date(syncState.updated_at).getTime();
    isStalled = (Date.now() - lastUpdate) > STALL_TIMEOUT_MS;
  }
  
  return {
    is_running: syncState?.is_running || false,
    is_stalled: isStalled,
    mode: syncState?.mode || null,
    current_page: syncState?.current_page || 0,
    max_page: syncState?.max_page || 0,
    total_synced: syncState?.total_synced || 0,
    last_run: syncState?.last_run_at || null,
    last_error: syncState?.last_error || null,
    catalog_size: totalAnimes || 0,
    updated_at: syncState?.updated_at || null,
  };
}

/**
 * Reseta estado travado
 */
async function resetImportState(supabase: any) {
  await supabase
    .from("sync_state")
    .upsert({
      id: "import",
      is_running: false,
      current_page: 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  
  return { success: true, message: "Estado resetado com sucesso" };
}

// Handler principal
Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializa cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET - Retorna status ou reseta
    if (req.method === "GET") {
      // Ação de reset via query param
      if (action === "reset") {
        const result = await resetImportState(supabase);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const status = await getImportStatus(supabase);
      
      return new Response(
        JSON.stringify({ success: true, data: status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Inicia/continua importação
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const mode = body.mode || "full";
      const page = body.page || 1; // Página inicial ou para continuar
      const since = body.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      console.log(`📥 Importação modo=${mode}, página=${page}`);
      
      // Busca estado atual
      const { data: currentState } = await supabase
        .from("sync_state")
        .select("is_running, updated_at, current_page")
        .eq("id", "import")
        .single();
      
      // Verifica se está travado
      let isStalled = false;
      if (currentState?.is_running && currentState?.updated_at) {
        const lastUpdate = new Date(currentState.updated_at).getTime();
        isStalled = (Date.now() - lastUpdate) > STALL_TIMEOUT_MS;
      }
      
      // Verifica se já está em execução (e não travado)
      if (currentState?.is_running && !isStalled) {
        // Se a requisição é para continuar na próxima página, permite
        if (page > 1 && page === (currentState.current_page || 0) + 1) {
          console.log(`📄 Continuando importação na página ${page}`);
        } else if (page === currentState.current_page) {
          // Mesma página, pode ser retry - permite
          console.log(`🔄 Retry da página ${page}`);
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: { code: "ALREADY_RUNNING", message: "Importação já em andamento" },
              data: {
                current_page: currentState.current_page,
                is_running: true
              }
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // Se estava travado, reseta antes de continuar
      if (isStalled) {
        console.log("⚠️ Detectado estado travado, resetando...");
        await resetImportState(supabase);
      }
      
      // Executa importação baseado no modo
      if (mode === "delta") {
        // Delta sync não é paginado (retorna todas as mudanças de uma vez)
        // Marca como em execução
        await supabase
          .from("sync_state")
          .upsert({
            id: "import",
            mode: "delta",
            is_running: true,
            current_page: 1,
            total_synced: 0,
            last_error: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
        
        const result = await deltaSync(supabase, since);
        
        return new Response(
          JSON.stringify({ 
            success: result.success, 
            continue: false,
            data: {
              stats: result.stats,
              logs: result.logs,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Full import paginado
        // Marca como em execução (se for a primeira página)
        if (page === 1) {
          await supabase
            .from("sync_state")
            .upsert({
              id: "import",
              mode: "full",
              is_running: true,
              current_page: 1,
              total_synced: 0,
              last_error: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
        }
        
        const result = await fullImportPaginated(supabase, page);
        
        return new Response(
          JSON.stringify({ 
            success: result.success, 
            continue: result.continue,
            data: {
              progress: result.progress,
              logs: result.logs,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET ou POST" } }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na edge function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { 
          code: "INTERNAL_ERROR", 
          message: error instanceof Error ? error.message : "Erro interno" 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
