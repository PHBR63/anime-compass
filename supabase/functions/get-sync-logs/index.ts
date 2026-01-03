import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge function para buscar logs de sincronização do catálogo
 * Retorna logs das edge functions e estatísticas de sincronização
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para log de sincronização
interface SyncLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  trigger?: string;
  mode?: string;
  stats?: {
    fetched?: number;
    inserted?: number;
    updated?: number;
    skipped?: number;
    errors?: number;
  };
}

// Interface para run de sincronização
interface SyncRun {
  id: string;
  started_at: string;
  completed_at?: string;
  trigger: string;
  mode: string;
  status: 'running' | 'completed' | 'failed';
  stats: {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  duration_ms?: number;
  logs: SyncLogEntry[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar se é admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar role de admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado - apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar parâmetros
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const hours = parseInt(url.searchParams.get('hours') || '24');

    console.log(`[get-sync-logs] Buscando logs das últimas ${hours} horas, limite: ${limit}`);

    // Calcular data limite
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Buscar dados de sincronização do catálogo
    const { data: recentSyncs, error: syncError } = await supabase
      .from('anime_catalog')
      .select('id, title, mal_id, last_synced_at, created_at, updated_at')
      .gte('last_synced_at', sinceDate.toISOString())
      .order('last_synced_at', { ascending: false })
      .limit(limit);

    if (syncError) {
      console.error('[get-sync-logs] Erro ao buscar syncs:', syncError);
    }

    // Agrupar sincronizações em "runs" baseado em proximidade temporal
    const runs: SyncRun[] = [];
    let currentRun: SyncRun | null = null;

    (recentSyncs || []).forEach((sync) => {
      if (!sync.last_synced_at) return;

      const syncTime = new Date(sync.last_synced_at);

      // Se não há run atual ou a diferença é maior que 2 minutos, criar nova run
      if (!currentRun || 
          Math.abs(syncTime.getTime() - new Date(currentRun.started_at).getTime()) > 120000) {
        
        if (currentRun) {
          // Calcular duração e finalizar run anterior
          const startTime = new Date(currentRun.started_at);
          const endTime = new Date(currentRun.completed_at || currentRun.started_at);
          currentRun.duration_ms = endTime.getTime() - startTime.getTime();
          currentRun.stats.fetched = currentRun.stats.updated + currentRun.stats.inserted;
          runs.push(currentRun);
        }

        // Criar nova run
        currentRun = {
          id: `run-${Date.now()}-${runs.length}`,
          started_at: sync.last_synced_at,
          completed_at: sync.last_synced_at,
          trigger: 'cron', // Assumir cron por padrão
          mode: 'top',
          status: 'completed',
          stats: {
            fetched: 0,
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: 0
          },
          logs: []
        };
      }

      // Adicionar ao run atual
      if (currentRun) {
        // Verificar se é inserção ou atualização
        const createdAt = new Date(sync.created_at);
        const updatedAt = new Date(sync.updated_at);
        const isNew = Math.abs(createdAt.getTime() - updatedAt.getTime()) < 1000;

        if (isNew) {
          currentRun.stats.inserted++;
        } else {
          currentRun.stats.updated++;
        }

        // Atualizar timestamps da run
        if (new Date(sync.last_synced_at) > new Date(currentRun.completed_at || currentRun.started_at)) {
          currentRun.completed_at = sync.last_synced_at;
        }
        if (new Date(sync.last_synced_at) < new Date(currentRun.started_at)) {
          currentRun.started_at = sync.last_synced_at;
        }

        // Adicionar log para este item
        currentRun.logs.push({
          id: sync.id,
          timestamp: sync.last_synced_at,
          level: 'info',
          message: `${isNew ? 'Inserido' : 'Atualizado'}: ${sync.title} (MAL #${sync.mal_id})`
        });
      }
    });

    // Adicionar última run
    if (currentRun !== null) {
      const finalRun = currentRun as SyncRun;
      const startTime = new Date(finalRun.started_at);
      const endTime = new Date(finalRun.completed_at || finalRun.started_at);
      finalRun.duration_ms = endTime.getTime() - startTime.getTime();
      finalRun.stats.fetched = finalRun.stats.updated + finalRun.stats.inserted;
      runs.push(finalRun);
    }

    // Gerar logs consolidados para exibição
    const allLogs: SyncLogEntry[] = [];
    
    runs.forEach((run, index) => {
      // Log de início
      allLogs.push({
        id: `${run.id}-start`,
        timestamp: run.started_at,
        level: 'info',
        message: `[sync] Starting sync - trigger: ${run.trigger}, mode: ${run.mode}`,
        trigger: run.trigger,
        mode: run.mode
      });

      // Log de fetch
      allLogs.push({
        id: `${run.id}-fetch`,
        timestamp: run.started_at,
        level: 'info',
        message: `[sync] Fetched ${run.stats.fetched} animes from Jikan`
      });

      // Log de conclusão
      allLogs.push({
        id: `${run.id}-complete`,
        timestamp: run.completed_at || run.started_at,
        level: 'success',
        message: `[sync] Completed - Inserted: ${run.stats.inserted}, Updated: ${run.stats.updated}, Skipped: ${run.stats.skipped}, Errors: ${run.stats.errors}`,
        stats: run.stats
      });
    });

    // Ordenar logs por timestamp (mais recente primeiro)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Estatísticas gerais
    const totalProcessed = runs.reduce((acc, r) => acc + r.stats.fetched, 0);
    const totalInserted = runs.reduce((acc, r) => acc + r.stats.inserted, 0);
    const totalUpdated = runs.reduce((acc, r) => acc + r.stats.updated, 0);
    const totalErrors = runs.reduce((acc, r) => acc + r.stats.errors, 0);

    console.log(`[get-sync-logs] Encontradas ${runs.length} runs, ${allLogs.length} logs`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          runs: runs.slice(0, 20), // Últimas 20 runs
          logs: allLogs.slice(0, 100), // Últimos 100 logs
          stats: {
            total_runs: runs.length,
            total_processed: totalProcessed,
            total_inserted: totalInserted,
            total_updated: totalUpdated,
            total_errors: totalErrors,
            period_hours: hours
          }
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[get-sync-logs] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
