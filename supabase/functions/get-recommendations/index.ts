import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";

// Ratings e tipos a serem filtrados (conteúdo adulto e músicas)
const EXCLUDED_RATINGS = ["Rx - Hentai"];
const EXCLUDED_TYPES = ["Music", "CM", "PV"];

// Função para filtrar animes indesejados
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

// Edge function para gerar recomendações personalizadas baseadas nos gêneros do usuário
serve(async (req) => {
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

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Obter usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar animes do usuário (completados e assistindo com boa nota)
    const { data: userAnimes, error: animesError } = await supabase
      .from("anime_entries")
      .select("mal_id, status, rating")
      .eq("user_id", user.id)
      .in("status", ["completed", "watching"])
      .order("rating", { ascending: false, nullsFirst: false });

    if (animesError) {
      console.error("Erro ao buscar animes:", animesError);
      throw new Error("Erro ao buscar animes do usuário");
    }

    // Se o usuário não tem animes, retorna lista vazia
    if (!userAnimes || userAnimes.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: "Adicione animes à sua lista para receber recomendações personalizadas!"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IDs dos animes que o usuário já tem na lista
    const userMalIds = new Set(userAnimes.map(a => a.mal_id));

    // Buscar detalhes dos animes favoritos do usuário para extrair gêneros
    // Pegar os top 5 com melhor nota ou os primeiros 5
    const topAnimes = userAnimes
      .filter(a => a.rating && Number(a.rating) >= 4)
      .slice(0, 5);
    
    const animesToAnalyze = topAnimes.length > 0 ? topAnimes : userAnimes.slice(0, 5);
    
    // Buscar gêneros de cada anime
    const genreCounts: Record<number, { name: string; count: number }> = {};
    
    for (const anime of animesToAnalyze) {
      try {
        // Aguardar um pouco para respeitar rate limit da API Jikan
        await new Promise(resolve => setTimeout(resolve, 350));
        
        const response = await fetch(`${JIKAN_BASE_URL}/anime/${anime.mal_id}`);
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
        console.warn(`Erro ao buscar anime ${anime.mal_id}:`, e);
      }
    }

    // Ordenar gêneros por frequência e pegar os top 3
    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([id, data]) => ({ id: Number(id), name: data.name }));

    console.log("Top gêneros do usuário:", topGenres);

    if (topGenres.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          topGenres: [],
          message: "Não foi possível identificar seus gêneros favoritos"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar recomendações baseadas nos gêneros favoritos
    const recommendations: any[] = [];
    const seenIds = new Set<number>();

    for (const genre of topGenres) {
      try {
        await new Promise(resolve => setTimeout(resolve, 350));
        
        const response = await fetch(
          `${JIKAN_BASE_URL}/anime?genres=${genre.id}&order_by=score&sort=desc&limit=10&sfw=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          // Aplicar filtro para remover conteúdo adulto e músicas
          const animes = filterAnimes(data.data || []);
          
          for (const anime of animes) {
            // Não recomendar animes que o usuário já tem
            if (!userMalIds.has(anime.mal_id) && !seenIds.has(anime.mal_id)) {
              seenIds.add(anime.mal_id);
              recommendations.push({
                ...anime,
                recommendedBecause: genre.name
              });
            }
          }
        }
      } catch (e) {
        console.warn(`Erro ao buscar recomendações para ${genre.name}:`, e);
      }
    }

    // Ordenar por score e limitar a 12 recomendações
    const finalRecommendations = recommendations
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 12);

    console.log(`Retornando ${finalRecommendations.length} recomendações`);

    return new Response(
      JSON.stringify({ 
        recommendations: finalRecommendations,
        topGenres,
        analyzedAnimes: animesToAnalyze.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função de recomendações:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
