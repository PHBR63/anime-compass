import { requireAdmin } from "../_shared/adminAuth.ts";
/**
 * Edge Function para sincronizar imagens de animes para CDN local
 * Processa em chunks pequenos (50 por execução) para evitar timeout
 * Frontend faz polling e re-invoca automaticamente enquanto houver imagens pendentes
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configurações - processamento síncrono em chunks pequenos
const CHUNK_SIZE = 50; // Imagens por execução (evita timeout)
const BATCH_SIZE = 5; // Imagens por lote interno
const SYNC_STATE_KEY = 'image_sync'; // Chave para armazenar estado no banco
const STALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos sem atualização = travado
const PROJECT_ID = 'tawcauhcogjnthocdhce'; // ID do projeto Supabase para validação

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
 * Verifica se a sincronização está travada (is_running true por muito tempo sem atualização)
 */
function isStalled(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const lastUpdate = new Date(updatedAt).getTime();
  const now = Date.now();
  return (now - lastUpdate) > STALL_TIMEOUT_MS;
}

/**
 * Atualiza o estado da sincronização no banco de dados
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
        last_run_at: progress.isRunning === false ? new Date().toISOString() : undefined,
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
    
    // Verificar se está travado
    const stalled = data.is_running && isStalled(data.updated_at);
    
    return {
      total: data.max_page || 0,
      processed: data.current_page || 0,
      success: data.total_synced || 0,
      failed: (data.current_page || 0) - (data.total_synced || 0),
      isRunning: stalled ? false : (data.is_running || false), // Se travado, retorna como não rodando
      lastError: stalled ? 'Sincronização travada - reset automático' : data.last_error,
      lastUpdated: data.updated_at,
      startedAt: data.last_run_at,
    };
  } catch (error) {
    console.error('[sync-images] Erro ao buscar estado:', error);
    return null;
  }
}

/**
 * Reseta o estado de sincronização (limpa is_running)
 */
async function resetSyncState(supabase: any) {
  try {
    const { error } = await supabase
      .from('sync_state')
      .update({
        is_running: false,
        last_error: 'Reset manual pelo usuário',
        updated_at: new Date().toISOString(),
      })
      .eq('id', SYNC_STATE_KEY);
    
    if (error) throw error;
    
    console.log('[sync-images] Estado resetado com sucesso');
    return { success: true, message: 'Estado resetado' };
  } catch (error) {
    console.error('[sync-images] Erro ao resetar:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Baixa uma imagem via proxy e retorna os bytes
 */
async function downloadImage(imageUrl: string, supabaseUrl: string): Promise<ArrayBuffer | null> {
  try {
    const proxyUrl = `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    
    const response = await fetch(proxyUrl, {
      headers: { 'Accept': 'image/*' },
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
 * Valida se a URL pertence ao projeto correto
 * Evita salvar URLs de outros projetos Supabase
 */
function isValidProjectUrl(url: string): boolean {
  if (!url) return false;
  
  // A URL deve conter o ID do projeto correto
  const isValid = url.includes(PROJECT_ID);
  
  if (!isValid) {
    console.warn(`[sync-images] URL inválida (projeto incorreto): ${url}`);
  }
  
  return isValid;
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
    
    const { data, error } = await supabase.storage
      .from('anime-images')
      .upload(fileName, imageData, {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error(`[sync-images] Erro no upload ${malId}:`, error);
      return null;
    }
    
    const { data: publicUrl } = supabase.storage
      .from('anime-images')
      .getPublicUrl(fileName);
    
    const finalUrl = publicUrl.publicUrl;
    
    // Validar se a URL gerada pertence ao projeto correto
    if (!isValidProjectUrl(finalUrl)) {
      console.error(`[sync-images] URL gerada não pertence ao projeto: ${finalUrl}`);
      return null;
    }
    
    return finalUrl;
  } catch (error) {
    console.error(`[sync-images] Erro no upload: ${error}`);
    return null;
  }
}

/**
 * Processa um único anime
 */
async function processAnime(
  supabase: any,
  supabaseUrl: string,
  anime: { mal_id: number; image_url: string }
): Promise<boolean> {
  try {
    // Baixar imagem
    const imageData = await downloadImage(anime.image_url, supabaseUrl);
    if (!imageData) return false;
    
    // Upload para storage
    const localUrl = await uploadToStorage(supabase, anime.mal_id, imageData, 'image/jpeg');
    if (!localUrl) return false;
    
    // Atualizar banco de dados
    const { error } = await supabase
      .from('anime_catalog')
      .update({ local_image_url: localUrl })
      .eq('mal_id', anime.mal_id);
    
    if (error) {
      console.error(`[sync-images] Erro ao atualizar ${anime.mal_id}:`, error);
      return false;
    }
    
    console.log(`[sync-images] ✓ ${anime.mal_id} sincronizado`);
    return true;
  } catch (error) {
    console.error(`[sync-images] Erro processando ${anime.mal_id}:`, error);
    return false;
  }
}

/**
 * Processa um chunk de animes (50 por execução)
 * Retorna se há mais imagens para processar
 */
async function processChunk(supabase: any, supabaseUrl: string, limit: number = CHUNK_SIZE) {
  // Buscar estado atual ou criar novo
  let currentState = await getSyncState(supabase);
  
  // Se está travado, resetar automaticamente
  if (currentState?.isRunning === false && currentState?.lastError?.includes('travada')) {
    console.log('[sync-images] Detectado estado travado, resetando...');
    await resetSyncState(supabase);
    currentState = null;
  }
  
  // Buscar animes pendentes
  const { data: animes, error, count } = await supabase
    .from('anime_catalog')
    .select('mal_id, image_url', { count: 'exact' })
    .or(`local_image_url.is.null,local_image_url.not.like.${supabaseUrl}/storage/v1/object/public/anime-images/%`)
    .not('image_url', 'is', null)
    .order('popularity', { ascending: true, nullsFirst: false })
    .limit(limit);
  
  if (error) {
    console.error('[sync-images] Erro ao buscar animes:', error);
    return { error: error.message, continue: false };
  }
  
  if (!animes || animes.length === 0) {
    console.log('[sync-images] Nenhum anime para sincronizar');
    await updateSyncState(supabase, { isRunning: false });
    return { message: 'Sincronização completa', continue: false, processed: 0, success: 0 };
  }
  
  const totalPending = count || animes.length;
  console.log(`[sync-images] Processando ${animes.length} de ${totalPending} animes pendentes...`);
  
  // Marcar como rodando
  await updateSyncState(supabase, {
    isRunning: true,
    total: totalPending,
    processed: currentState?.processed || 0,
    success: currentState?.success || 0,
  });
  
  let success = 0;
  let failed = 0;
  let processed = 0;
  
  // Processar em mini-batches para atualizar progresso frequentemente
  for (let i = 0; i < animes.length; i += BATCH_SIZE) {
    const batch = animes.slice(i, i + BATCH_SIZE);
    
    for (const anime of batch) {
      const ok = await processAnime(supabase, supabaseUrl, anime);
      if (ok) success++;
      else failed++;
      processed++;
    }
    
    // Atualizar estado após cada mini-batch
    await updateSyncState(supabase, {
      isRunning: true,
      total: totalPending,
      processed: (currentState?.processed || 0) + processed,
      success: (currentState?.success || 0) + success,
      currentMalId: batch[batch.length - 1]?.mal_id,
    });
  }
  
  // Verificar se há mais para processar
  const hasMore = totalPending > animes.length;
  
  // SEMPRE marcar como não rodando ao final do chunk
  // Isso permite que o cron job dispare o próximo chunk
  await updateSyncState(supabase, {
    isRunning: false,
    total: totalPending,
    processed: (currentState?.processed || 0) + processed,
    success: (currentState?.success || 0) + success,
  });
  
  console.log(`[sync-images] Chunk concluído: ${success} sucesso, ${failed} falhas. Continue: ${hasMore}`);
  
  return {
    processed,
    success,
    failed,
    totalPending,
    continue: hasMore, // Frontend deve chamar novamente se true
  };
}

/** Retorna cobertura do projeto atual; URLs de outros ambientes são pendências. */
async function getImageStats(supabase: any, supabaseUrl: string) {
  const { count: totalAnimes } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true });
  
  const { count: withLocalImage } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true })
    .like('local_image_url', `${supabaseUrl}/storage/v1/object/public/anime-images/%`);
  
  const { count: withExternalImage } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true })
    .or(`local_image_url.is.null,local_image_url.not.like.${supabaseUrl}/storage/v1/object/public/anime-images/%`)
    .not('image_url', 'is', null);
  
  const { count: withoutImage } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true })
    .or(`local_image_url.is.null,local_image_url.not.like.${supabaseUrl}/storage/v1/object/public/anime-images/%`)
    .is('image_url', null);
  
  const syncState = await getSyncState(supabase);
  
  return {
    totalAnimes: totalAnimes || 0,
    withLocalImage: withLocalImage || 0,
    withExternalImage: withExternalImage || 0,
    withoutImage: withoutImage || 0,
    localCoverage: totalAnimes ? Math.round((withLocalImage || 0) / totalAnimes * 10000) / 100 : 0,
    syncProgress: syncState?.isRunning ? syncState : null,
    isStalled: syncState?.lastError?.includes('travada'),
  };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Impede acesso privilegiado sem papel admin ou token do agendamento.
  const access = await requireAdmin(req);
  if (access.status !== 200) {
    return new Response(JSON.stringify({ success: false, error: access.error }), {
      status: access.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // GET: Retorna status/estatísticas
    if (req.method === 'GET') {
      // Ação de reset
      if (action === 'reset') {
        const result = await resetSyncState(supabase);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Progresso atual
      if (action === 'progress') {
        const syncState = await getSyncState(supabase);
        return new Response(
          JSON.stringify(syncState || { isRunning: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Estatísticas padrão
      const stats = await getImageStats(supabase, supabaseUrl);
      return new Response(
        JSON.stringify(stats),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST: Processa um chunk de imagens
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const limit = body.limit ? parseInt(body.limit) : CHUNK_SIZE;
      
      // Verificar se já está em execução (evita execuções paralelas)
      const currentState = await getSyncState(supabase);
      if (currentState?.isRunning) {
        return new Response(
          JSON.stringify({ 
            error: 'Sincronização já em andamento', 
            progress: currentState,
            continue: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Processar chunk
      const result = await processChunk(supabase, supabaseUrl, limit);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[sync-images] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
