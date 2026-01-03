/**
 * Edge Function: sync-anime-catalog
 * Sincroniza o catálogo de animes com a API Jikan
 * Executada automaticamente a cada 2 horas via pg_cron
 * 
 * Parâmetros (body JSON):
 * - trigger: 'cron' | 'manual' - Tipo de disparo
 * - batch_size: number - Quantidade de animes por batch (default: 25)
 * - mode: 'top' | 'season' | 'update' | 'genre' | 'popular' | 'bulk' - Modo de sincronização
 * - page: number - Página inicial (para mode 'top', 'season', 'popular')
 * - genre_id: number - ID do gênero para mode 'genre'
 * - max_pages: number - Número máximo de páginas a buscar (para mode 'bulk')
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
  errors: string[];
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
    
    stats.mode = mode;
    console.log(`[sync] Starting sync - trigger: ${trigger}, mode: ${mode}, batch: ${batchSize}, maxPages: ${maxPages}`);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
