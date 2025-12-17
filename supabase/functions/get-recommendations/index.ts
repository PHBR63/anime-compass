import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: get-recommendations
 * Retorna recomendações personalizadas de animes baseadas nos gêneros favoritos do usuário
 * OTIMIZADO: Implementa rate limiting com retry e delays adequados
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";

// Delay entre requisições para respeitar rate limit da Jikan (3 req/s)
const DELAY_BETWEEN_REQUESTS = 400; // 400ms = 2.5 req/s (margem de segurança)

// Ratings e tipos a serem filtrados (conteúdo adulto e músicas)
const EXCLUDED_RATINGS = ["Rx - Hentai"];
const EXCLUDED_TYPES = ["Music", "CM", "PV"];

/**
 * Função para criar delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Busca com retry e tratamento de rate limit
 */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        console.log(`[Jikan] Rate limited, aguardando 2s antes de retry ${i + 1}/${retries}`);
        await delay(2000);
        continue;
      }
      
      return response;
    } catch (error) {
      console.warn(`[Jikan] Erro na requisição (tentativa ${i + 1}):`, error);
      if (i === retries - 1) throw error;
      await delay(1000);
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Função para filtrar animes indesejados
 */
const filterAnimes = (animes: any[]): any[] => {
  return animes.filter(anime => {
    if (anime.rating && EXCLUDED_RATINGS.includes(anime.rating)) {
      return false;
    }
    if (anime.type && EXCLUDED_TYPES.includes(anime.type)) {
      return false;
    }
    return true;
  });
};

// Edge function principal
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter o token de autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase com service role para validar token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extrair o token JWT do header
    const token = authHeader.replace("Bearer ", "");
    
    // Validar o token e obter o usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("[Recommendations] Erro ao validar usuário:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado ou sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[Recommendations] Usuário autenticado: ${user.id}`);

    // Buscar animes do usuário (completados e assistindo com boa nota)
    const { data: userAnimes, error: animesError } = await supabase
      .from("anime_entries")
      .select("mal_id, status, rating")
      .eq("user_id", user.id)
      .in("status", ["completed", "watching"])
      .order("rating", { ascending: false, nullsFirst: false });

    if (animesError) {
      console.error("[Recommendations] Erro ao buscar animes:", animesError);
      throw new Error("Erro ao buscar animes do usuário");
    }

    // Se o usuário não tem animes, retorna lista vazia
    if (!userAnimes || userAnimes.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          topGenres: [],
          message: "Adicione animes à sua lista para receber recomendações personalizadas!"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IDs dos animes que o usuário já tem na lista
    const userMalIds = new Set(userAnimes.map(a => a.mal_id));

    // Pegar os top 5 com melhor nota ou os primeiros 5
    const topAnimes = userAnimes
      .filter(a => a.rating && Number(a.rating) >= 4)
      .slice(0, 5);
    
    // Limita análise a 3 animes para reduzir requisições
    const animesToAnalyze = (topAnimes.length > 0 ? topAnimes : userAnimes.slice(0, 5)).slice(0, 3);
    
    // Buscar gêneros de cada anime (SEQUENCIAL com delays)
    const genreCounts: Record<number, { name: string; count: number }> = {};
    
    for (const anime of animesToAnalyze) {
      try {
        await delay(DELAY_BETWEEN_REQUESTS);
        
        const response = await fetchWithRetry(`${JIKAN_BASE_URL}/anime/${anime.mal_id}`);
        if (response.ok) {
          const data = await response.json();
          const genres = data.data?.genres || [];
          
          for (const genre of genres) {
            if (genreCounts[genre.mal_id]) {
              genreCounts[genre.mal_id].count++;
            } else {
              genreCounts[genre.mal_id] = { name: genre.name, count: 1 };
            }
          }
        }
      } catch (e) {
        console.warn(`[Recommendations] Erro ao buscar anime ${anime.mal_id}:`, e);
      }
    }

    // Ordenar gêneros por frequência e pegar os top 3
    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([id, data]) => ({ id: Number(id), name: data.name }));

    console.log("[Recommendations] Top gêneros do usuário:", topGenres);

    // Se não conseguiu identificar gêneros, usar gêneros populares
    const genresToSearch = topGenres.length > 0 
      ? topGenres 
      : [{ id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }, { id: 8, name: 'Drama' }];

    // Buscar recomendações baseadas nos gêneros (SEQUENCIAL)
    const recommendations: any[] = [];
    const seenIds = new Set<number>();

    for (const genre of genresToSearch) {
      try {
        await delay(DELAY_BETWEEN_REQUESTS);
        
        const response = await fetchWithRetry(
          `${JIKAN_BASE_URL}/anime?genres=${genre.id}&order_by=score&sort=desc&limit=8&sfw=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          const animes = filterAnimes(data.data || []);
          
          for (const anime of animes) {
            if (!userMalIds.has(anime.mal_id) && !seenIds.has(anime.mal_id)) {
              seenIds.add(anime.mal_id);
              recommendations.push({
                ...anime,
                recommendedBecause: `Baseado no seu interesse em ${genre.name}`
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[Recommendations] Erro ao buscar recomendações para ${genre.name}:`, e);
      }
    }

    // Ordenar por score e limitar a 12 recomendações
    const finalRecommendations = recommendations
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 12);

    console.log(`[Recommendations] Retornando ${finalRecommendations.length} recomendações`);

    return new Response(
      JSON.stringify({ 
        recommendations: finalRecommendations,
        topGenres: genresToSearch,
        analyzedAnimes: animesToAnalyze.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Recommendations] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
