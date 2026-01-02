/**
 * Edge Function: sync-anime-catalog
 * Sincroniza o catálogo de animes com a API Jikan
 * Executada automaticamente a cada 2 horas via pg_cron
 * 
 * Parâmetros (body JSON):
 * - trigger: 'cron' | 'manual' - Tipo de disparo
 * - batch_size: number - Quantidade de animes por batch (default: 25)
 * - mode: 'top' | 'season' | 'update' - Modo de sincronização
 * - page: number - Página inicial (para mode 'top' ou 'season')
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
    errors: [],
  };

  try {
    // Parse body
    const body = await req.json().catch(() => ({}));
    const trigger = body.trigger || 'manual';
    const batchSize = Math.min(body.batch_size || 25, 50);
    const mode = body.mode || 'top';
    const startPage = body.page || 1;
    
    stats.mode = mode;
    console.log(`[sync] Starting sync - trigger: ${trigger}, mode: ${mode}, batch: ${batchSize}`);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar animes baseado no modo
    const animesToSync: JikanAnime[] = [];
    let currentPage = startPage;
    const maxPages = Math.ceil(batchSize / 25); // Jikan retorna 25 por página

    for (let i = 0; i < maxPages && animesToSync.length < batchSize; i++) {
      let url = '';
      
      switch (mode) {
        case 'season':
          // Temporada atual
          url = `${JIKAN_BASE_URL}/seasons/now?page=${currentPage}&sfw=true`;
          break;
        case 'update':
          // Buscar animes que precisam atualização (mais de 2h desde último sync)
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          const { data: staleAnimes } = await supabase
            .from('anime_catalog')
            .select('mal_id')
            .lt('last_synced_at', twoHoursAgo)
            .order('last_synced_at', { ascending: true })
            .limit(batchSize);
          
          if (staleAnimes && staleAnimes.length > 0) {
            // Buscar detalhes de cada anime que precisa atualização
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
          url = `${JIKAN_BASE_URL}/top/anime?page=${currentPage}&sfw=true`;
          break;
      }

      // Buscar da API (exceto modo update que já buscou acima)
      if (url && mode !== 'update') {
        await delay(JIKAN_DELAY_MS);
        
        try {
          const response = await fetchWithRetry(url);
          if (response.ok) {
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              animesToSync.push(...data.data);
              stats.total_fetched += data.data.length;
            }
          }
        } catch (error) {
          stats.errors.push(`Failed to fetch page ${currentPage}: ${error}`);
        }
      }

      currentPage++;
    }

    console.log(`[sync] Fetched ${animesToSync.length} animes from Jikan`);

    // Processar e salvar animes
    for (const anime of animesToSync) {
      if (!shouldIncludeAnime(anime)) {
        stats.total_skipped++;
        continue;
      }

      const catalogData = mapToCatalog(anime);

      try {
        // Upsert no catálogo
        const { error } = await supabase
          .from('anime_catalog')
          .upsert(catalogData, {
            onConflict: 'mal_id',
            ignoreDuplicates: false,
          });

        if (error) {
          stats.errors.push(`Failed to upsert anime ${anime.mal_id}: ${error.message}`);
        } else {
          // Verificar se foi insert ou update
          const { data: existing } = await supabase
            .from('anime_catalog')
            .select('created_at, updated_at')
            .eq('mal_id', anime.mal_id)
            .single();
          
          if (existing && existing.created_at === existing.updated_at) {
            stats.total_inserted++;
          } else {
            stats.total_updated++;
          }
        }
      } catch (error) {
        stats.errors.push(`Exception for anime ${anime.mal_id}: ${error}`);
      }
    }

    stats.completed_at = new Date().toISOString();
    
    console.log(`[sync] Completed - Inserted: ${stats.total_inserted}, Updated: ${stats.total_updated}, Skipped: ${stats.total_skipped}, Errors: ${stats.errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      stats,
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
      stats,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
