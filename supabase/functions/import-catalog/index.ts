/**
 * Edge Function: import-catalog
 * 
 * Importa animes de uma API externa para popular o catálogo local.
 * Suporta importação completa (full) e sincronização incremental (delta).
 * 
 * Endpoints:
 * - POST: Inicia importação (mode=full ou mode=delta)
 * - GET: Retorna status da importação atual
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
const BATCH_SIZE = 500; // Registros por batch de upsert

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
): Promise<{ inserted: number; updated: number; errors: number }> {
  const stats = { inserted: 0, updated: 0, errors: 0 };
  
  // Mapeia animes para formato local
  const mappedAnimes = animes.map(mapExternalToLocal);
  
  // Upsert em batch usando mal_id como chave
  const { data, error } = await supabase
    .from("anime_catalog")
    .upsert(mappedAnimes, { 
      onConflict: "mal_id",
      ignoreDuplicates: false 
    })
    .select("mal_id");

  if (error) {
    logs.push(`❌ Erro no batch: ${error.message}`);
    stats.errors = mappedAnimes.length;
  } else {
    stats.inserted = data?.length || 0;
    logs.push(`✅ Batch processado: ${stats.inserted} registros`);
  }

  return stats;
}

/**
 * Importação completa do catálogo
 */
async function fullImport(
  supabase: any
): Promise<{ success: boolean; stats: Record<string, number>; logs: string[] }> {
  const logs: string[] = [];
  const stats = { total: 0, inserted: 0, updated: 0, errors: 0, batches: 0 };
  
  logs.push("🚀 Iniciando importação completa...");
  
  try {
    // Busca todos os animes da API externa
    logs.push(`📡 Buscando dados de ${EXTERNAL_API_URL}?action=export`);
    
    const response = await fetch(`${EXTERNAL_API_URL}?action=export`);
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error("Formato de resposta inválido");
    }
    
    const animes: ExternalAnime[] = data.data;
    stats.total = animes.length;
    logs.push(`📦 Recebidos ${stats.total} animes para importar`);
    
    // Processa em batches
    for (let i = 0; i < animes.length; i += BATCH_SIZE) {
      const batch = animes.slice(i, i + BATCH_SIZE);
      stats.batches++;
      
      logs.push(`⏳ Processando batch ${stats.batches} (${i + 1}-${Math.min(i + BATCH_SIZE, animes.length)})`);
      
      const batchStats = await processBatch(supabase, batch, logs);
      stats.inserted += batchStats.inserted;
      stats.updated += batchStats.updated;
      stats.errors += batchStats.errors;
    }
    
    // Atualiza timestamp de sincronização
    await supabase
      .from("sync_state")
      .upsert({
        id: "import",
        mode: "full",
        is_running: false,
        total_synced: stats.inserted,
        last_run_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    
    logs.push(`✅ Importação completa! ${stats.inserted} animes importados em ${stats.batches} batches`);
    
    return { success: true, stats, logs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logs.push(`❌ Erro na importação: ${errorMessage}`);
    
    // Registra erro no sync_state
    await supabase
      .from("sync_state")
      .upsert({
        id: "import",
        mode: "full",
        is_running: false,
        last_error: errorMessage,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    
    return { success: false, stats, logs };
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
  const stats = { total: 0, inserted: 0, updated: 0, errors: 0, batches: 0 };
  
  logs.push(`🔄 Iniciando sincronização delta desde ${since}...`);
  
  try {
    // Busca mudanças desde a última sincronização
    const url = `${EXTERNAL_API_URL}?action=changes&since=${encodeURIComponent(since)}`;
    logs.push(`📡 Buscando de ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Erro na API externa");
    }
    
    const animes: ExternalAnime[] = data.data || [];
    stats.total = animes.length;
    
    if (animes.length === 0) {
      logs.push("✅ Nenhuma atualização encontrada");
      return { success: true, stats, logs };
    }
    
    logs.push(`📦 Recebidas ${stats.total} atualizações`);
    
    // Processa em batches
    for (let i = 0; i < animes.length; i += BATCH_SIZE) {
      const batch = animes.slice(i, i + BATCH_SIZE);
      stats.batches++;
      
      const batchStats = await processBatch(supabase, batch, logs);
      stats.inserted += batchStats.inserted;
      stats.updated += batchStats.updated;
      stats.errors += batchStats.errors;
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
    
    logs.push(`✅ Delta sync completo! ${stats.inserted} atualizações aplicadas`);
    
    return { success: true, stats, logs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logs.push(`❌ Erro no delta sync: ${errorMessage}`);
    
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
  
  return {
    is_running: syncState?.is_running || false,
    mode: syncState?.mode || null,
    last_run: syncState?.last_run_at || null,
    last_error: syncState?.last_error || null,
    total_synced: syncState?.total_synced || 0,
    catalog_size: totalAnimes || 0,
  };
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

    // GET - Retorna status
    if (req.method === "GET") {
      const status = await getImportStatus(supabase);
      
      return new Response(
        JSON.stringify({ success: true, data: status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Inicia importação
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const mode = body.mode || "full";
      const since = body.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default: últimas 24h
      
      console.log(`📥 Iniciando importação modo=${mode}`);
      
      // Verifica se já está em execução
      const { data: currentState } = await supabase
        .from("sync_state")
        .select("is_running")
        .eq("id", "import")
        .single();
      
      if (currentState?.is_running) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { code: "ALREADY_RUNNING", message: "Importação já em andamento" } 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Marca como em execução
      await supabase
        .from("sync_state")
        .upsert({
          id: "import",
          mode,
          is_running: true,
          current_page: 1,
          total_synced: 0,
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      
      // Executa importação
      let result;
      if (mode === "delta") {
        result = await deltaSync(supabase, since);
      } else {
        result = await fullImport(supabase);
      }
      
      return new Response(
        JSON.stringify({ 
          success: result.success, 
          data: {
            stats: result.stats,
            logs: result.logs,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
