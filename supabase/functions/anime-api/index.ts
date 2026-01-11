/**
 * Edge Function: anime-api
 * API pública para consulta do catálogo de animes
 * 
 * Endpoints:
 * - GET /anime-api - Listar com filtros e paginação
 * - GET /anime-api?id={uuid} - Buscar por ID interno
 * - GET /anime-api?mal_id={number} - Buscar por MAL ID
 * - GET /anime-api?action=stats - Estatísticas do catálogo
 * - GET /anime-api?action=genres - Listar todos os gêneros
 * - GET /anime-api?action=studios - Listar todos os estúdios
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers CORS para acesso público
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Tipos da API
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: PaginationMeta;
  meta?: Record<string, unknown>;
}

interface StatsResponse {
  total_anime: number;
  with_images: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  year_range: { min: number; max: number };
  score_range: { min: number; max: number };
  last_sync: string | null;
}

/**
 * Sanitiza termo de busca removendo caracteres especiais do Postgrest
 * que podem quebrar a sintaxe de queries .or()
 */
function sanitizeSearchTerm(term: string): string {
  // Remove caracteres especiais do Postgrest: , ( ) . "
  return term.replace(/[,()."]/g, '').trim();
}

// Funções auxiliares
function jsonResponse<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

function parseNumber(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseFloatValue(value: string | null, defaultValue: number | null): number | null {
  if (!value) return defaultValue;
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas GET permitido
  if (req.method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only GET requests are allowed', 405);
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Roteamento baseado em parâmetros
    const action = params.get('action');
    const id = params.get('id');
    const malId = params.get('mal_id');

    let response: Response;

    if (action === 'stats') {
      response = await handleStats(supabase);
    } else if (action === 'genres') {
      response = await handleGenres(supabase);
    } else if (action === 'studios') {
      response = await handleStudios(supabase);
    } else if (id || malId) {
      response = await handleGetById(supabase, id, malId);
    } else {
      response = await handleList(supabase, params);
    }

    const duration = Date.now() - startTime;
    console.log(`[anime-api] ${req.method} ${url.search || '/'} - ${response.status} (${duration}ms)`);

    return response;
  } catch (error) {
    console.error('[anime-api] Error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
});

/**
 * Listar animes com filtros, busca, ordenação e paginação
 */
async function handleList(supabase: any, params: URLSearchParams): Promise<Response> {
  // Paginação
  const page = Math.max(1, parseNumber(params.get('page'), 1));
  const limit = Math.min(100, Math.max(1, parseNumber(params.get('limit'), 24)));
  const offset = (page - 1) * limit;

  // Ordenação
  const sortField = params.get('sort') || 'score';
  const sortOrder = params.get('order') === 'asc';
  const validSortFields = ['score', 'popularity', 'year', 'title', 'rank', 'members', 'created_at', 'updated_at'];
  const actualSortField = validSortFields.includes(sortField) ? sortField : 'score';

  // Tipos bloqueados que nunca devem aparecer nos resultados
  const BLOCKED_TYPES = ['Music', 'CM', 'PV'];

  // Construir query
  let query = supabase
    .from('anime_catalog')
    .select('*', { count: 'exact' })
    // Excluir tipos bloqueados (comerciais, músicas, previews)
    .not('type', 'in', `(${BLOCKED_TYPES.join(',')})`)

  // Filtro de busca por texto (sanitizado para evitar injeção)
  const search = params.get('search');
  if (search) {
    const sanitized = sanitizeSearchTerm(search);
    if (sanitized) {
      const searchTerm = `%${sanitized}%`;
      query = query.or(`title.ilike.${searchTerm},title_english.ilike.${searchTerm},title_japanese.ilike.${searchTerm}`);
    }
  }

  // Filtro de status (separado por vírgula)
  const status = params.get('status');
  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    query = query.in('status', statuses);
  }

  // Filtro de tipo (separado por vírgula)
  const type = params.get('type');
  if (type) {
    const types = type.split(',').map(t => t.trim());
    query = query.in('type', types);
  }

  // Filtro de temporada (separado por vírgula)
  const season = params.get('season');
  if (season) {
    const seasons = season.split(',').map(s => s.trim().toLowerCase());
    query = query.in('season', seasons);
  }

  // Range de anos
  const yearMin = parseNumber(params.get('year_min'), 0);
  const yearMax = parseNumber(params.get('year_max'), 0);
  if (yearMin > 0) {
    query = query.gte('year', yearMin);
  }
  if (yearMax > 0) {
    query = query.lte('year', yearMax);
  }

  // Range de notas
  const scoreMin = parseFloatValue(params.get('score_min'), null);
  const scoreMax = parseFloatValue(params.get('score_max'), null);
  if (scoreMin !== null) {
    query = query.gte('score', scoreMin);
  }
  if (scoreMax !== null) {
    query = query.lte('score', scoreMax);
  }

  // Filtro por gênero (nome ou mal_id)
  const genre = params.get('genre');
  if (genre) {
    const genreId = parseInt(genre, 10);
    if (!isNaN(genreId)) {
      query = query.contains('genres', [{ mal_id: genreId }]);
    } else {
      query = query.contains('genres', [{ name: genre }]);
    }
  }

  // Filtro por estúdio (nome ou mal_id)
  const studio = params.get('studio');
  if (studio) {
    const studioId = parseInt(studio, 10);
    if (!isNaN(studioId)) {
      query = query.contains('studios', [{ mal_id: studioId }]);
    } else {
      query = query.contains('studios', [{ name: studio }]);
    }
  }

  // Filtro por imagem disponível
  const hasImage = params.get('has_image');
  if (hasImage === 'true') {
    query = query.not('image_url', 'is', null);
  } else if (hasImage === 'false') {
    query = query.is('image_url', null);
  }

  // Filtro por sinopse PT-BR disponível
  const hasSynopsisPt = params.get('has_synopsis_pt');
  if (hasSynopsisPt === 'true') {
    query = query.not('synopsis_pt', 'is', null);
  } else if (hasSynopsisPt === 'false') {
    query = query.is('synopsis_pt', null);
  }

  // Aplicar ordenação e paginação
  query = query
    .order(actualSortField, { ascending: sortOrder, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[anime-api] Database error:', error);
    return errorResponse('DATABASE_ERROR', error.message, 500);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };

  return jsonResponse({
    success: true,
    data: data || [],
    pagination,
  });
}

/**
 * Buscar anime por ID interno ou MAL ID
 */
async function handleGetById(supabase: any, id: string | null, malId: string | null): Promise<Response> {
  let query = supabase.from('anime_catalog').select('*');

  if (id) {
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse('INVALID_ID', 'Invalid UUID format for id parameter', 400);
    }
    query = query.eq('id', id);
  } else if (malId) {
    const malIdNum = parseInt(malId, 10);
    if (isNaN(malIdNum)) {
      return errorResponse('INVALID_MAL_ID', 'mal_id must be a valid number', 400);
    }
    query = query.eq('mal_id', malIdNum);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('NOT_FOUND', 'Anime not found', 404);
    }
    console.error('[anime-api] Database error:', error);
    return errorResponse('DATABASE_ERROR', error.message, 500);
  }

  return jsonResponse({
    success: true,
    data,
  });
}

/**
 * Obter estatísticas do catálogo
 */
async function handleStats(supabase: any): Promise<Response> {
  // Total de animes
  const { count: totalAnime } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true });

  // Total com imagens
  const { count: withImages } = await supabase
    .from('anime_catalog')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null);

  // Buscar todos para agregações
  const { data: allAnime } = await supabase
    .from('anime_catalog')
    .select('type, status, year, score, last_synced_at')
    .order('last_synced_at', { ascending: false })
    .limit(10000);

  // Agregar por tipo e status
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let minYear = Infinity;
  let maxYear = -Infinity;
  let minScore = Infinity;
  let maxScore = -Infinity;
  let lastSync: string | null = null;

  if (allAnime) {
    for (const anime of allAnime) {
      // Primeira iteração define último sync
      if (!lastSync && anime.last_synced_at) {
        lastSync = anime.last_synced_at;
      }
      
      // Contagem por tipo
      if (anime.type) {
        byType[anime.type] = (byType[anime.type] || 0) + 1;
      }
      // Contagem por status
      if (anime.status) {
        byStatus[anime.status] = (byStatus[anime.status] || 0) + 1;
      }
      // Range de anos
      if (anime.year) {
        minYear = Math.min(minYear, anime.year);
        maxYear = Math.max(maxYear, anime.year);
      }
      // Range de notas
      if (anime.score) {
        minScore = Math.min(minScore, anime.score);
        maxScore = Math.max(maxScore, anime.score);
      }
    }
  }

  const stats: StatsResponse = {
    total_anime: totalAnime || 0,
    with_images: withImages || 0,
    by_type: byType,
    by_status: byStatus,
    year_range: {
      min: minYear === Infinity ? 0 : minYear,
      max: maxYear === -Infinity ? 0 : maxYear,
    },
    score_range: {
      min: minScore === Infinity ? 0 : minScore,
      max: maxScore === -Infinity ? 0 : maxScore,
    },
    last_sync: lastSync,
  };

  return jsonResponse({
    success: true,
    data: stats,
  });
}

/**
 * Listar todos os gêneros únicos
 */
async function handleGenres(supabase: any): Promise<Response> {
  const { data, error } = await supabase
    .from('anime_catalog')
    .select('genres');

  if (error) {
    console.error('[anime-api] Database error:', error);
    return errorResponse('DATABASE_ERROR', error.message, 500);
  }

  // Extrair gêneros únicos
  const genreMap = new Map<number, { mal_id: number; name: string; count: number }>();

  if (data) {
    for (const anime of data) {
      if (anime.genres && Array.isArray(anime.genres)) {
        for (const genre of anime.genres) {
          if (genre.mal_id && genre.name) {
            const existing = genreMap.get(genre.mal_id);
            if (existing) {
              existing.count++;
            } else {
              genreMap.set(genre.mal_id, { mal_id: genre.mal_id, name: genre.name, count: 1 });
            }
          }
        }
      }
    }
  }

  // Ordenar por nome
  const genres = Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return jsonResponse({
    success: true,
    data: genres,
    meta: { total: genres.length },
  });
}

/**
 * Listar todos os estúdios únicos
 */
async function handleStudios(supabase: any): Promise<Response> {
  const { data, error } = await supabase
    .from('anime_catalog')
    .select('studios');

  if (error) {
    console.error('[anime-api] Database error:', error);
    return errorResponse('DATABASE_ERROR', error.message, 500);
  }

  // Extrair estúdios únicos
  const studioMap = new Map<number, { mal_id: number; name: string; count: number }>();

  if (data) {
    for (const anime of data) {
      if (anime.studios && Array.isArray(anime.studios)) {
        for (const studio of anime.studios) {
          if (studio.mal_id && studio.name) {
            const existing = studioMap.get(studio.mal_id);
            if (existing) {
              existing.count++;
            } else {
              studioMap.set(studio.mal_id, { mal_id: studio.mal_id, name: studio.name, count: 1 });
            }
          }
        }
      }
    }
  }

  // Ordenar por nome
  const studios = Array.from(studioMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return jsonResponse({
    success: true,
    data: studios,
    meta: { total: studios.length },
  });
}
