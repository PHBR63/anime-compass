/**
 * Edge Function para sincronizar imagens de animes para CDN local
 * Baixa imagens do MyAnimeList e faz upload para Supabase Storage
 * Suporta execução em background com progresso em tempo real via banco de dados
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configurações
const BATCH_SIZE = 10; // Imagens por lote
const DELAY_BETWEEN_BATCHES = 500; // 500ms entre lotes para melhor performance
const SYNC_STATE_KEY = 'image_sync'; // Chave para armazenar estado no banco

interface SyncProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  isRunning: boolean;
  currentMalId?: number;
  startedAt?: string;
  lastError?: string;
  lastUpdated?: string;
}

/**
 * Atualiza o estado da sincronização no banco de dados
 * Usa a tabela sync_state para persistir o progresso
 */
async function updateSyncState(supabase: any, progress: Partial<SyncProgress>) {
  try {
    const { error } = await supabase
      .from('sync_state')
      .upsert({
        id: SYNC_STATE_KEY,
        mode: 'image_sync',
        is_running: progress.isRunning ?? false,
        current_page: progress.processed ?? 0,
        max_page: progress.total ?? 0,
        total_synced: progress.success ?? 0,
        last_error: progress.lastError ?? null,
        updated_at: new Date().toISOString(),
        last_run_at: progress.isRunning ? undefined : new Date().toISOString(),
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('[sync-images] Erro ao salvar estado:', error);
    }
  } catch (error) {
    console.error('[sync-images] Erro ao atualizar estado:', error);
  }
}

/**
 * Busca o estado da sincronização do banco de dados
 */
async function getSyncState(supabase: any): Promise<SyncProgress | null> {
  try {
    const { data, error } = await supabase
      .from('sync_state')
      .select('*')
      .eq('id', SYNC_STATE_KEY)
      .single();
    
    if (error || !data) return null;
    
    return {
      total: data.max_page || 0,
      processed: data.current_page || 0,
      success: data.total_synced || 0,
      failed: (data.current_page || 0) - (data.total_synced || 0),
      isRunning: data.is_running || false,
      lastError: data.last_error,
      lastUpdated: data.updated_at,
      startedAt: data.last_run_at,
    };
  } catch (error) {
    console.error('[sync-images] Erro ao buscar estado:', error);
    return null;
  }
}

/**
 * Baixa uma imagem via proxy e retorna os bytes
 */
async function downloadImage(imageUrl: string, supabaseUrl: string): Promise<ArrayBuffer | null> {
  try {
    // Usar proxy para evitar problemas de CORS com MyAnimeList
    const proxyUrl = `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'image/*',
      },
    });
    
    if (!response.ok) {
      console.log(`[sync-images] Falha ao baixar ${imageUrl}: ${response.status}`);
      return null;
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`[sync-images] Erro ao baixar imagem: ${error}`);
    return null;
  }
}

/**
 * Faz upload da imagem para Supabase Storage
 */
async function uploadToStorage(
  supabase: any,
  malId: number,
  imageData: ArrayBuffer,
  contentType: string
): Promise<string | null> {
  try {
    const extension = contentType.includes('png') ? 'png' : 
                      contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `covers/${malId}.${extension}`;
    
    // Upload para o bucket
    const { data, error } = await supabase.storage
      .from('anime-images')
      .upload(fileName, imageData, {
        contentType,
        upsert: true, // Sobrescrever se já existir
      });
    
    if (error) {
      console.error(`[sync-images] Erro no upload ${malId}:`, error);
      return null;
    }
    
    // Gerar URL pública
    const { data: publicUrl } = supabase.storage
      .from('anime-images')
      .getPublicUrl(fileName);
    
    return publicUrl.publicUrl;
  } catch (error) {
    console.error(`[sync-images] Erro no upload: ${error}`);
    return null;
  }
}

/**
 * Processa um lote de animes
 */
async function processBatch(
  supabase: any,
  supabaseUrl: string,
  animes: { mal_id: number; image_url: string }[],
  progress: SyncProgress
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const anime of animes) {
    progress.currentMalId = anime.mal_id;
    
    try {
      // Baixar imagem
      const imageData = await downloadImage(anime.image_url, supabaseUrl);
      
      if (!imageData) {
        failed++;
        progress.processed++;
        continue;
      }
      
      // Upload para storage
      const localUrl = await uploadToStorage(supabase, anime.mal_id, imageData, 'image/jpeg');
      
      if (!localUrl) {
        failed++;
        progress.processed++;
        continue;
      }
      
      // Atualizar banco de dados
      const { error } = await supabase
        .from('anime_catalog')
        .update({ local_image_url: localUrl })
        .eq('mal_id', anime.mal_id);
      
      if (error) {
        console.error(`[sync-images] Erro ao atualizar ${anime.mal_id}:`, error);
        failed++;
      } else {
        success++;
        console.log(`[sync-images] ✓ ${anime.mal_id} sincronizado`);
      }
    } catch (error) {
      console.error(`[sync-images] Erro processando ${anime.mal_id}:`, error);
      failed++;
      progress.lastError = `Erro no anime ${anime.mal_id}: ${error}`;
    }
    
    progress.processed++;
  }
  
  return { success, failed };
}

/**
 * Executa a sincronização completa em background
 */
async function runSyncBackground(supabase: any, supabaseUrl: string, animes: any[]) {
  const progress: SyncProgress = {
    total: animes.length,
    processed: 0,
    success: 0,
    failed: 0,
    isRunning: true,
    startedAt: new Date().toISOString(),
  };
  
  try {
    // Marcar início
    await updateSyncState(supabase, progress);
    
    console.log(`[sync-images] Processando ${animes.length} animes em background...`);
    
    // Processar em lotes
    for (let i = 0; i < animes.length; i += BATCH_SIZE) {
      const batch = animes.slice(i, i + BATCH_SIZE);
      const result = await processBatch(supabase, supabaseUrl, batch, progress);
      
      progress.success += result.success;
      progress.failed += result.failed;
      
      // Atualizar estado a cada lote para progresso em tempo real
      await updateSyncState(supabase, progress);
      
      console.log(`[sync-images] Progresso: ${progress.processed}/${progress.total} (${progress.success} OK, ${progress.failed} falhas)`);
      
      // Delay entre lotes para não sobrecarregar
      if (i + BATCH_SIZE < animes.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log(`[sync-images] ✅ Sincronização concluída: ${progress.success} sucesso, ${progress.failed} falhas`);
  } catch (error) {
    console.error('[sync-images] Erro na sincronização:', error);
    progress.lastError = String(error);
  } finally {
    progress.isRunning = false;
    await updateSyncState(supabase, progress);
  }
}

/**
 * Inicia a sincronização em background usando EdgeRuntime.waitUntil
 */
async function startSync(supabase: any, supabaseUrl: string, limit?: number) {
  // Verificar se já está em execução
  const currentState = await getSyncState(supabase);
  if (currentState?.isRunning) {
    return { error: 'Sincronização já em andamento', progress: currentState };
  }
  
  console.log('[sync-images] Iniciando sincronização de imagens...');
  
  // Buscar animes sem local_image_url
  let query = supabase
    .from('anime_catalog')
    .select('mal_id, image_url')
    .is('local_image_url', null)
    .not('image_url', 'is', null)
    .order('popularity', { ascending: true, nullsFirst: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: animes, error } = await query;
  
  if (error) {
    console.error('[sync-images] Erro ao buscar animes:', error);
    return { error: error.message };
  }
  
  if (!animes || animes.length === 0) {
    console.log('[sync-images] Nenhum anime para sincronizar');
    return { message: 'Nenhum anime para sincronizar', total: 0 };
  }
  
  console.log(`[sync-images] ${animes.length} animes para sincronizar`);
  
  // Iniciar em background usando EdgeRuntime.waitUntil
  const backgroundTask = runSyncBackground(supabase, supabaseUrl, animes);
  
  // @ts-ignore - EdgeRuntime existe no ambiente Deno/Supabase
  if (typeof EdgeRuntime !== 'undefined') {
    // @ts-ignore
    EdgeRuntime.waitUntil(backgroundTask);
  } else {
    // Fallback para ambiente sem EdgeRuntime (não aguarda)
    backgroundTask.catch(console.error);
  }
  
  return {
    message: 'Sincronização iniciada em background',
    total: animes.length,
  };
}

/**
 * Retorna estatísticas de imagens
 */
async function getImageStats(supabase: any) {
  // Total de animes
  const { count: totalAnimes } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true });
  
  // Animes com imagem local
  const { count: withLocalImage } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true })
    .not('local_image_url', 'is', null);
  
  // Animes com imagem externa
  const { count: withExternalImage } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true })
    .is('local_image_url', null)
    .not('image_url', 'is', null);
  
  // Animes sem nenhuma imagem
  const { count: withoutImage } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true })
    .is('local_image_url', null)
    .is('image_url', null);
  
  // Buscar estado da sincronização do banco
  const syncState = await getSyncState(supabase);
  
  return {
    totalAnimes: totalAnimes || 0,
    withLocalImage: withLocalImage || 0,
    withExternalImage: withExternalImage || 0,
    withoutImage: withoutImage || 0,
    localCoverage: totalAnimes ? Math.round((withLocalImage || 0) / totalAnimes * 100) : 0,
    syncProgress: syncState?.isRunning ? syncState : null,
  };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // GET: Retorna status/estatísticas
    if (req.method === 'GET') {
      if (action === 'progress') {
        const syncState = await getSyncState(supabase);
        return new Response(
          JSON.stringify(syncState || { isRunning: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Estatísticas padrão
      const stats = await getImageStats(supabase);
      
      return new Response(
        JSON.stringify(stats),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST: Inicia sincronização
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const limit = body.limit ? parseInt(body.limit) : undefined;
      const autoStart = body.autoStart === true;
      
      // Se autoStart, não iniciar se já há imagens locais suficientes
      if (autoStart) {
        const stats = await getImageStats(supabase);
        if (stats.localCoverage >= 90) {
          return new Response(
            JSON.stringify({ 
              message: 'Cobertura já está em 90%+, sincronização automática ignorada',
              coverage: stats.localCoverage 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      const result = await startSync(supabase, supabaseUrl, limit);
      
      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error, progress: result.progress }),
          { 
            status: result.progress ? 200 : 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('[sync-images] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
