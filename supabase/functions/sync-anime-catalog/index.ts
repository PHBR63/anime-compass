/**
 * Edge Function: sync-anime-catalog
 * Sincroniza o catálogo de animes com a API Jikan
 * Executada automaticamente a cada 2 horas via pg_cron
 * 
 * Parâmetros (body JSON):
 * - trigger: 'cron' | 'manual' - Tipo de disparo
 * - batch_size: number - Quantidade de animes por batch (default: 25)
 * - mode: 'top' | 'season' | 'update' | 'genre' | 'popular' | 'bulk' | 'sequential' | 'auto' - Modo de sincronização
 * - page: number - Página inicial (para mode 'top', 'season', 'popular')
 * - genre_id: number - ID do gênero para mode 'genre'
 * - max_pages: number - Número máximo de páginas a buscar (para mode 'bulk')
 * - pages_per_run: number - Páginas por execução no modo sequential (default: 20)
 * 
 * Modo 'sequential': Busca animes página por página, salvando progresso no banco
 * Modo 'auto': Verifica estado salvo e continua de onde parou automaticamente
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações de rate limiting para Jikan API
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const JIKAN_DELAY_MS = 400; // 400ms entre requests (2.5 req/s)
const MAX_RETRIES = 3;

// Tipos de ratings a excluir
const EXCLUDED_RATINGS = ['Rx - Hentai', 'R+ - Mild Nudity'];
const EXCLUDED_TYPES = ['Music'];

// Lista de gêneros para sincronização em massa (30 gêneros)
const POPULAR_GENRES = [
  // Gêneros principais
  { id: 1, name: 'Action' },
  { id: 2, name: 'Adventure' },
  { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasy' },
  { id: 14, name: 'Horror' },
  { id: 7, name: 'Mystery' },
  { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' },
  { id: 36, name: 'Slice of Life' },
  { id: 30, name: 'Sports' },
  { id: 37, name: 'Supernatural' },
  { id: 41, name: 'Suspense' },
  // Demographics
  { id: 27, name: 'Shounen' },
  { id: 25, name: 'Shoujo' },
  { id: 42, name: 'Seinen' },
  { id: 43, name: 'Josei' },
  // Gêneros adicionais
  { id: 62, name: 'Isekai' },
  { id: 18, name: 'Mecha' },
  { id: 38, name: 'Military' },
  { id: 40, name: 'Psychological' },
  { id: 23, name: 'School' },
  { id: 20, name: 'Parody' },
  { id: 21, name: 'Samurai' },
  { id: 13, name: 'Historical' },
  { id: 29, name: 'Space' },
  { id: 32, name: 'Vampire' },
  { id: 47, name: 'Gourmet' },
  { id: 46, name: 'Award Winning' },
  { id: 17, name: 'Martial Arts' },
];

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  episodes: number | null;
  status: string | null;
  type: string | null;
  rating: string | null;
  year: number | null;
  season: string | null;
  genres: { mal_id: number; name: string }[];
  studios: { mal_id: number; name: string }[];
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
}

interface SyncStats {
  started_at: string;
  completed_at?: string;
  mode: string;
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_skipped: number;
  total_pages_processed: number;
  current_page?: number;
  errors: string[];
}

interface SyncState {
  id: string;
  mode: string;
  current_page: number;
  max_page: number;
  last_error: string | null;
  last_run_at: string | null;
  total_synced: number;
  is_running: boolean;
}

// Função auxiliar para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch com retry e rate limiting
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      // Rate limit hit
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
        console.log(`[sync] Rate limited, waiting ${retryAfter}s...`);
        await delay(retryAfter * 1000);
        continue;
      }
      
      return response;
    } catch (error) {
      console.error(`[sync] Fetch error (attempt ${attempt + 1}):`, error);
      if (attempt < retries - 1) {
        await delay(1000 * (attempt + 1));
      }
    }
  }
  
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

// Filtrar animes indesejados
function shouldIncludeAnime(anime: JikanAnime): boolean {
  if (!anime.mal_id || !anime.title) return false;
  if (anime.rating && EXCLUDED_RATINGS.includes(anime.rating)) return false;
  if (anime.type && EXCLUDED_TYPES.includes(anime.type)) return false;
  return true;
}

// Mapear anime do Jikan para formato do catálogo
function mapToCatalog(anime: JikanAnime) {
  return {
    mal_id: anime.mal_id,
    title: anime.title,
    title_english: anime.title_english,
    title_japanese: anime.title_japanese,
    synopsis: anime.synopsis,
    score: anime.score,
    scored_by: anime.scored_by,
    rank: anime.rank,
    popularity: anime.popularity,
    members: anime.members,
    episodes: anime.episodes,
    status: anime.status,
    type: anime.type,
    rating: anime.rating,
    year: anime.year,
    season: anime.season?.toLowerCase(),
    genres: anime.genres || [],
    studios: anime.studios || [],
    image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Buscar animes de uma URL com paginação
async function fetchAnimesFromUrl(
  baseUrl: string, 
  startPage: number, 
  maxPages: number, 
  stats: SyncStats
): Promise<JikanAnime[]> {
  const animes: JikanAnime[] = [];
  let currentPage = startPage;
  let hasNextPage = true;
  let pagesProcessed = 0;

  while (hasNextPage && pagesProcessed < maxPages) {
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${currentPage}`;
    console.log(`[sync] Fetching: ${url}`);
    
    await delay(JIKAN_DELAY_MS);
    
    try {
      const response = await fetchWithRetry(url);
      if (response.ok) {
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          animes.push(...data.data);
          stats.total_fetched += data.data.length;
          pagesProcessed++;
          stats.total_pages_processed++;
          
          console.log(`[sync] Page ${currentPage}: ${data.data.length} animes (total: ${animes.length})`);
          
          // Verificar se há próxima página
          hasNextPage = data.pagination?.has_next_page || false;
        } else {
          hasNextPage = false;
        }
      } else {
        stats.errors.push(`HTTP ${response.status} for ${url}`);
        hasNextPage = false;
      }
    } catch (error) {
      stats.errors.push(`Failed page ${currentPage}: ${error}`);
      hasNextPage = false;
    }

    currentPage++;
  }

  return animes;
}

// Buscar uma única página e salvar imediatamente
async function fetchAndSavePage(
  supabase: any,
  page: number,
  stats: SyncStats
): Promise<{ success: boolean; hasNextPage: boolean; animesCount: number }> {
  const url = `${JIKAN_BASE_URL}/anime?order_by=members&sort=desc&sfw=true&page=${page}`;
  console.log(`[sync-seq] Fetching page ${page}: ${url}`);
  
  try {
    await delay(JIKAN_DELAY_MS);
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      stats.errors.push(`HTTP ${response.status} for page ${page}`);
      return { success: false, hasNextPage: false, animesCount: 0 };
    }
    
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.log(`[sync-seq] Page ${page}: No data, reached end`);
      return { success: true, hasNextPage: false, animesCount: 0 };
    }
    
    // Filtrar e mapear animes
    const validAnimes = data.data
      .filter(shouldIncludeAnime)
      .map(mapToCatalog);
    
    if (validAnimes.length > 0) {
      // Salvar imediatamente
      const { error } = await supabase
        .from('anime_catalog')
        .upsert(validAnimes, {
          onConflict: 'mal_id',
          ignoreDuplicates: false,
        });
      
      if (error) {
        stats.errors.push(`Page ${page} upsert error: ${error.message}`);
        return { success: false, hasNextPage: true, animesCount: 0 };
      }
      
      stats.total_updated += validAnimes.length;
      stats.total_fetched += data.data.length;
      console.log(`[sync-seq] Page ${page}: Saved ${validAnimes.length} animes`);
    }
    
    stats.total_pages_processed++;
    const hasNextPage = data.pagination?.has_next_page || false;
    
    return { success: true, hasNextPage, animesCount: validAnimes.length };
  } catch (error) {
    stats.errors.push(`Page ${page} exception: ${error}`);
    return { success: false, hasNextPage: true, animesCount: 0 };
  }
}

// Atualizar estado de sincronização
async function updateSyncState(
  supabase: any,
  updates: Partial<SyncState>
): Promise<void> {
  const { error } = await supabase
    .from('sync_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default');
  
  if (error) {
    console.error('[sync] Failed to update sync state:', error);
  }
}

// Obter estado atual de sincronização
async function getSyncState(supabase: any): Promise<SyncState | null> {
  const { data, error } = await supabase
    .from('sync_state')
    .select('*')
    .eq('id', 'default')
    .single();
  
  if (error) {
    console.error('[sync] Failed to get sync state:', error);
    return null;
  }
  
  return data;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stats: SyncStats = {
    started_at: new Date().toISOString(),
    mode: 'unknown',
    total_fetched: 0,
    total_inserted: 0,
    total_updated: 0,
    total_skipped: 0,
    total_pages_processed: 0,
    errors: [],
  };

  try {
    // Parse body
    const body = await req.json().catch(() => ({}));
    const trigger = body.trigger || 'manual';
    const batchSize = Math.min(body.batch_size || 25, 100);
    const mode = body.mode || 'top';
    const startPage = body.page || 1;
    const genreId = body.genre_id;
    const maxPages = body.max_pages || 4; // Padrão: 4 páginas (100 animes)
    const pagesPerRun = body.pages_per_run || 20; // Páginas por execução no modo sequential
    
    stats.mode = mode;
    console.log(`[sync] Starting sync - trigger: ${trigger}, mode: ${mode}, batch: ${batchSize}, maxPages: ${maxPages}`);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Modo AUTO: Continua de onde parou automaticamente
    if (mode === 'auto') {
      const syncState = await getSyncState(supabase);
      
      if (!syncState) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Sync state not found',
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Se já completou todas as páginas
      if (syncState.current_page >= syncState.max_page) {
        console.log(`[sync-auto] Already completed all ${syncState.max_page} pages`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Sync already completed',
          data: { 
            current_page: syncState.current_page,
            max_page: syncState.max_page,
            total_synced: syncState.total_synced,
          },
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Marcar como em execução
      await updateSyncState(supabase, {
        mode: 'sequential',
        is_running: true,
        last_run_at: new Date().toISOString(),
        last_error: null,
      });
      
      console.log(`[sync-auto] Resuming from page ${syncState.current_page}`);
      
      let currentPage = syncState.current_page;
      let consecutiveErrors = 0;
      let pagesProcessed = 0;
      
      // Processar páginas até atingir limite ou encontrar erros
      while (pagesProcessed < pagesPerRun && currentPage <= syncState.max_page && consecutiveErrors < 3) {
        const result = await fetchAndSavePage(supabase, currentPage, stats);
        
        if (result.success) {
          consecutiveErrors = 0;
          currentPage++;
          pagesProcessed++;
          
          // Atualizar progresso a cada 5 páginas
          if (pagesProcessed % 5 === 0) {
            await updateSyncState(supabase, {
              current_page: currentPage,
              total_synced: syncState.total_synced + stats.total_updated,
            });
          }
          
          // Se não há mais páginas, finalizou
          if (!result.hasNextPage) {
            console.log(`[sync-auto] Reached end of data at page ${currentPage - 1}`);
            currentPage = syncState.max_page + 1; // Marca como completo
            break;
          }
        } else {
          consecutiveErrors++;
          console.log(`[sync-auto] Error on page ${currentPage}, consecutive errors: ${consecutiveErrors}`);
          
          // Esperar um pouco antes de tentar novamente
          await delay(2000);
        }
      }
      
      // Atualizar estado final
      const finalState: Partial<SyncState> = {
        current_page: currentPage,
        is_running: false,
        total_synced: syncState.total_synced + stats.total_updated,
      };
      
      if (stats.errors.length > 0) {
        finalState.last_error = stats.errors[stats.errors.length - 1];
      }
      
      if (currentPage > syncState.max_page) {
        finalState.mode = 'completed';
      }
      
      await updateSyncState(supabase, finalState);
      
      stats.completed_at = new Date().toISOString();
      stats.current_page = currentPage;
      
      const duration = new Date(stats.completed_at).getTime() - new Date(stats.started_at).getTime();
      console.log(`[sync-auto] Run completed in ${Math.round(duration / 1000)}s - Pages: ${pagesProcessed}, Updated: ${stats.total_updated}, Current: ${currentPage}/${syncState.max_page}`);
      
      return new Response(JSON.stringify({
        success: true,
        data: { 
          stats,
          next_page: currentPage,
          max_page: syncState.max_page,
          progress: Math.round((currentPage / syncState.max_page) * 100),
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Modo SEQUENTIAL: Busca páginas sequenciais com estado persistente
    if (mode === 'sequential') {
      const requestedStartPage = body.start_page || 1;
      const requestedMaxPage = body.max_page || 1000;
      
      // Resetar ou iniciar estado
      await updateSyncState(supabase, {
        mode: 'sequential',
        current_page: requestedStartPage,
        max_page: requestedMaxPage,
        is_running: true,
        last_run_at: new Date().toISOString(),
        last_error: null,
        total_synced: 0,
      });
      
      console.log(`[sync-seq] Starting sequential sync from page ${requestedStartPage} to ${requestedMaxPage}`);
      
      let currentPage = requestedStartPage;
      let consecutiveErrors = 0;
      let pagesProcessed = 0;
      
      while (pagesProcessed < pagesPerRun && currentPage <= requestedMaxPage && consecutiveErrors < 3) {
        const result = await fetchAndSavePage(supabase, currentPage, stats);
        
        if (result.success) {
          consecutiveErrors = 0;
          currentPage++;
          pagesProcessed++;
          
          if (pagesProcessed % 5 === 0) {
            await updateSyncState(supabase, {
              current_page: currentPage,
              total_synced: stats.total_updated,
            });
          }
          
          if (!result.hasNextPage) {
            console.log(`[sync-seq] Reached end at page ${currentPage - 1}`);
            break;
          }
        } else {
          consecutiveErrors++;
          await delay(2000);
        }
      }
      
      const completed = currentPage > requestedMaxPage || consecutiveErrors >= 3;
      
      await updateSyncState(supabase, {
        current_page: currentPage,
        is_running: false,
        mode: completed ? 'completed' : 'sequential',
        total_synced: stats.total_updated,
        last_error: stats.errors.length > 0 ? stats.errors[stats.errors.length - 1] : null,
      });
      
      stats.completed_at = new Date().toISOString();
      stats.current_page = currentPage;
      
      const duration = new Date(stats.completed_at).getTime() - new Date(stats.started_at).getTime();
      console.log(`[sync-seq] Run completed in ${Math.round(duration / 1000)}s - Pages: ${pagesProcessed}, Updated: ${stats.total_updated}`);
      
      return new Response(JSON.stringify({
        success: true,
        data: { 
          stats,
          next_page: currentPage,
          max_page: requestedMaxPage,
          progress: Math.round((currentPage / requestedMaxPage) * 100),
          needs_continuation: !completed,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar animes baseado no modo
    let animesToSync: JikanAnime[] = [];

    switch (mode) {
      case 'season':
        // Temporada atual
        animesToSync = await fetchAnimesFromUrl(
          `${JIKAN_BASE_URL}/seasons/now?sfw=true`,
          startPage,
          maxPages,
          stats
        );
        break;

      case 'popular':
        // Animes por popularidade (membros)
        animesToSync = await fetchAnimesFromUrl(
          `${JIKAN_BASE_URL}/top/anime?filter=bypopularity&sfw=true`,
          startPage,
          maxPages,
          stats
        );
        break;

      case 'genre':
        // Animes de um gênero específico
        if (genreId) {
          animesToSync = await fetchAnimesFromUrl(
            `${JIKAN_BASE_URL}/anime?genres=${genreId}&order_by=members&sort=desc&sfw=true`,
            startPage,
            maxPages,
            stats
          );
        } else {
          stats.errors.push('genre_id is required for mode "genre"');
        }
        break;

      case 'bulk':
        // Sincronização em massa - busca de múltiplos gêneros
        // Salva progressivamente após cada gênero para evitar perda de dados em timeout
        console.log(`[sync] Bulk mode - fetching from ${POPULAR_GENRES.length} genres (saving progressively)`);
        
        for (const genre of POPULAR_GENRES) {
          console.log(`[sync] Fetching genre: ${genre.name} (ID: ${genre.id})`);
          
          const genreAnimes = await fetchAnimesFromUrl(
            `${JIKAN_BASE_URL}/anime?genres=${genre.id}&order_by=members&sort=desc&sfw=true`,
            1,
            10, // 10 páginas por gênero (250 animes)
            stats
          );
          
          // Salvar imediatamente após cada gênero
          if (genreAnimes.length > 0) {
            const validAnimes = genreAnimes
              .filter(shouldIncludeAnime)
              .map(mapToCatalog);
            
            if (validAnimes.length > 0) {
              try {
                const { error } = await supabase
                  .from('anime_catalog')
                  .upsert(validAnimes, {
                    onConflict: 'mal_id',
                    ignoreDuplicates: false,
                  });
                
                if (error) {
                  stats.errors.push(`Genre ${genre.name} upsert error: ${error.message}`);
                  stats.total_skipped += validAnimes.length;
                } else {
                  stats.total_updated += validAnimes.length;
                  console.log(`[sync] Saved ${validAnimes.length} animes from ${genre.name}`);
                }
              } catch (error) {
                stats.errors.push(`Genre ${genre.name} exception: ${error}`);
                stats.total_skipped += validAnimes.length;
              }
            }
          }
          
          // Pausa maior entre gêneros para evitar rate limiting
          await delay(1000);
        }
        
        // Retornar imediatamente - dados já foram salvos
        stats.completed_at = new Date().toISOString();
        const bulkDuration = new Date(stats.completed_at).getTime() - new Date(stats.started_at).getTime();
        console.log(`[sync] Completed in ${Math.round(bulkDuration / 1000)}s - Fetched: ${stats.total_fetched}, Updated: ${stats.total_updated}, Skipped: ${stats.total_skipped}, Pages: ${stats.total_pages_processed}, Errors: ${stats.errors.length}`);
        
        return new Response(JSON.stringify({
          success: true,
          data: { stats },
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'update':
        // Buscar animes que precisam atualização (mais de 24h desde último sync)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: staleAnimes } = await supabase
          .from('anime_catalog')
          .select('mal_id')
          .lt('last_synced_at', oneDayAgo)
          .order('last_synced_at', { ascending: true })
          .limit(batchSize);
        
        if (staleAnimes && staleAnimes.length > 0) {
          console.log(`[sync] Updating ${staleAnimes.length} stale animes`);
          
          for (const stale of staleAnimes) {
            await delay(JIKAN_DELAY_MS);
            try {
              const response = await fetchWithRetry(`${JIKAN_BASE_URL}/anime/${stale.mal_id}`);
              if (response.ok) {
                const data = await response.json();
                if (data.data) {
                  animesToSync.push(data.data);
                  stats.total_fetched++;
                }
              }
            } catch (error) {
              stats.errors.push(`Failed to fetch anime ${stale.mal_id}: ${error}`);
            }
          }
        }
        break;

      case 'top':
      default:
        // Top animes por score
        animesToSync = await fetchAnimesFromUrl(
          `${JIKAN_BASE_URL}/top/anime?sfw=true`,
          startPage,
          maxPages,
          stats
        );
        break;
    }

    console.log(`[sync] Total fetched: ${animesToSync.length} animes`);

    // Remover duplicatas por mal_id
    const uniqueAnimes = Array.from(
      new Map(animesToSync.map(a => [a.mal_id, a])).values()
    );
    console.log(`[sync] Unique animes: ${uniqueAnimes.length}`);

    // Processar e salvar animes em batches
    const UPSERT_BATCH_SIZE = 50;
    const batches = [];
    
    for (let i = 0; i < uniqueAnimes.length; i += UPSERT_BATCH_SIZE) {
      batches.push(uniqueAnimes.slice(i, i + UPSERT_BATCH_SIZE));
    }

    for (const batch of batches) {
      const validAnimes = batch
        .filter(shouldIncludeAnime)
        .map(mapToCatalog);

      if (validAnimes.length === 0) {
        stats.total_skipped += batch.length;
        continue;
      }

      try {
        // Upsert em batch
        const { error, data } = await supabase
          .from('anime_catalog')
          .upsert(validAnimes, {
            onConflict: 'mal_id',
            ignoreDuplicates: false,
          })
          .select('mal_id');

        if (error) {
          stats.errors.push(`Batch upsert error: ${error.message}`);
          stats.total_skipped += validAnimes.length;
        } else {
          // Contar como updated (upsert não diferencia bem)
          stats.total_updated += validAnimes.length;
        }
      } catch (error) {
        stats.errors.push(`Batch exception: ${error}`);
        stats.total_skipped += validAnimes.length;
      }
    }

    stats.completed_at = new Date().toISOString();
    
    const duration = new Date(stats.completed_at).getTime() - new Date(stats.started_at).getTime();
    console.log(`[sync] Completed in ${Math.round(duration / 1000)}s - Fetched: ${stats.total_fetched}, Updated: ${stats.total_updated}, Skipped: ${stats.total_skipped}, Pages: ${stats.total_pages_processed}, Errors: ${stats.errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      data: { stats },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync] Fatal error:', error);
    stats.errors.push(`Fatal error: ${error}`);
    stats.completed_at = new Date().toISOString();

    return new Response(JSON.stringify({
      success: false,
      error: 'Sync failed',
      data: { stats },
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
