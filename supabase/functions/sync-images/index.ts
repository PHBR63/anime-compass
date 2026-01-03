/**
 * Edge Function para sincronizar imagens de animes para CDN local
 * Baixa imagens do MyAnimeList e faz upload para Supabase Storage
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configurações
const BATCH_SIZE = 10; // Imagens por lote
const DELAY_BETWEEN_BATCHES = 1000; // 1 segundo entre lotes

interface SyncProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  isRunning: boolean;
  currentMalId?: number;
  startedAt?: string;
  lastError?: string;
}

// Estado global de progresso (em memória)
let syncProgress: SyncProgress = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  isRunning: false,
};

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
  animes: { mal_id: number; image_url: string }[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const anime of animes) {
    syncProgress.currentMalId = anime.mal_id;
    
    try {
      // Baixar imagem
      const imageData = await downloadImage(anime.image_url, supabaseUrl);
      
      if (!imageData) {
        failed++;
        continue;
      }
      
      // Upload para storage
      const localUrl = await uploadToStorage(supabase, anime.mal_id, imageData, 'image/jpeg');
      
      if (!localUrl) {
        failed++;
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
        console.log(`[sync-images] ✓ ${anime.mal_id} sincronizado: ${localUrl}`);
      }
    } catch (error) {
      console.error(`[sync-images] Erro processando ${anime.mal_id}:`, error);
      failed++;
      syncProgress.lastError = `Erro no anime ${anime.mal_id}: ${error}`;
    }
    
    syncProgress.processed++;
  }
  
  return { success, failed };
}

/**
 * Inicia a sincronização em background
 */
async function startSync(supabase: any, supabaseUrl: string, limit?: number) {
  if (syncProgress.isRunning) {
    return { error: 'Sincronização já em andamento' };
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
  
  // Inicializar progresso
  syncProgress = {
    total: animes.length,
    processed: 0,
    success: 0,
    failed: 0,
    isRunning: true,
    startedAt: new Date().toISOString(),
  };
  
  console.log(`[sync-images] ${animes.length} animes para sincronizar`);
  
  // Processar em background usando Promise não aguardada
  // O Deno mantém a função viva enquanto há promessas pendentes
  const backgroundTask = (async () => {
    try {
      // Processar em lotes
      for (let i = 0; i < animes.length; i += BATCH_SIZE) {
        const batch = animes.slice(i, i + BATCH_SIZE);
        const result = await processBatch(supabase, supabaseUrl, batch);
        
        syncProgress.success += result.success;
        syncProgress.failed += result.failed;
        
        console.log(`[sync-images] Progresso: ${syncProgress.processed}/${syncProgress.total}`);
        
        // Delay entre lotes para não sobrecarregar
        if (i + BATCH_SIZE < animes.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
      
      console.log(`[sync-images] Sincronização concluída: ${syncProgress.success} sucesso, ${syncProgress.failed} falhas`);
    } catch (error) {
      console.error('[sync-images] Erro na sincronização:', error);
      syncProgress.lastError = String(error);
    } finally {
      syncProgress.isRunning = false;
    }
  })();
  
  // Não aguarda a conclusão - execução em background
  
  return {
    message: 'Sincronização iniciada',
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
  
  return {
    totalAnimes: totalAnimes || 0,
    withLocalImage: withLocalImage || 0,
    withExternalImage: withExternalImage || 0,
    withoutImage: withoutImage || 0,
    localCoverage: totalAnimes ? Math.round((withLocalImage || 0) / totalAnimes * 100) : 0,
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
        return new Response(
          JSON.stringify(syncProgress),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Estatísticas padrão
      const stats = await getImageStats(supabase);
      
      return new Response(
        JSON.stringify({
          ...stats,
          syncProgress: syncProgress.isRunning ? syncProgress : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST: Inicia sincronização
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const limit = body.limit ? parseInt(body.limit) : undefined;
      
      const result = await startSync(supabase, supabaseUrl, limit);
      
      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { 
            status: 400, 
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
