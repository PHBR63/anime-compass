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
      // Listagem usa a mesma função SQL da Descobrir (números idênticos entre banco, API e app).
      // Cliente com a chave pública + JWT do chamador: auth.uid() vem do token validado, nunca de user_id no pedido.
      const clientePublico = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` } },
      });
      response = await handleList(clientePublico, params);
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
 * Lista animes pela função SQL discover_catalog: filtros, total exato, desempate por mal_id
 * e exclusão da lista do usuário (hide_in_list) feita no banco antes de paginar/contar.
 */
async function handleList(supabase: any, params: URLSearchParams): Promise<Response> {
  const page = Math.max(1, parseNumber(params.get('page'), 1));
  const limit = Math.min(60, Math.max(1, parseNumber(params.get('limit'), 24)));
  const filtros: Record<string, unknown> = {};
  // Parâmetros aceitos (nomes iguais aos do app).
  for (const chave of ['search', 'genre', 'studio', 'type', 'status', 'season', 'season_year', 'year_min', 'year_max', 'score_min', 'hide_in_list']) {
    const valor = params.get(chave);
    if (valor !== null && valor !== '') filtros[chave] = chave === 'search' ? sanitizeSearchTerm(valor) : valor;
  }
  const { data, error } = await supabase.rpc('discover_catalog', {
    p: filtros, p_sort: params.get('sort') || 'score', p_order: params.get('order') || 'desc', p_page: page, p_limit: limit,
  });
  if (error) {
    if (error.message?.includes('intervalo_ano_invalido')) return errorResponse('INVALID_RANGE', 'year_min deve ser menor ou igual a year_max', 400);
    console.error('[anime-api] Database error:', error);
    return errorResponse('DATABASE_ERROR', error.message, 500);
  }
  const total = Number(data.total) || 0;
  const totalPages = Math.ceil(total / limit);
  return jsonResponse({
    success: true,
    data: data.items || [],
    pagination: { page, limit, total, total_pages: totalPages, has_next: Boolean(data.has_next), has_prev: page > 1 },
    meta: { hide_in_list_applied: data.hide_in_list_applied },
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

  // Usa maybeSingle para tratar animes ausentes como resultado vazio,
  // não como erro da Edge Function. Isso evita falsos RUNTIME_ERROR/404
  // quando a lista do usuário contém um MAL ID ainda não importado no catálogo.
  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[anime-api] Database error:', error);
    return errorResponse('DATABASE_ERROR', error.message, 500);
  }

  if (!data) {
    return jsonResponse({
      success: true,
      data: null,
      meta: {
        found: false,
        reason: 'Anime ainda não está disponível no catálogo local',
      },
    });
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
  // A agregação SQL considera todo o catálogo e não depende do limite de linhas da API.
  const { data, error } = await supabase.rpc('get_catalog_stats');
  if (error) throw error;
  return jsonResponse({ success: true, data: data as StatsResponse });
}

/**
 * Gêneros do catálogo elegível inteiro, agregados no SQL (sem limite de 1000 linhas).
 * Contagens são globais (escopo "catalogo_elegivel"); itens podem não ter ID MAL.
 */
async function handleGenres(supabase: any): Promise<Response> {
  const { data, error } = await supabase.rpc('discover_facets');
  if (error) return errorResponse('DATABASE_ERROR', error.message, 500);
  return jsonResponse({ success: true, data: data.genres, meta: { total: data.genres.length, scope: data.scope } });
}

/** Estúdios do catálogo elegível inteiro (mesma origem e escopo dos gêneros). */
async function handleStudios(supabase: any): Promise<Response> {
  const { data, error } = await supabase.rpc('discover_facets');
  if (error) return errorResponse('DATABASE_ERROR', error.message, 500);
  return jsonResponse({ success: true, data: data.studios, meta: { total: data.studios.length, scope: data.scope } });
}
