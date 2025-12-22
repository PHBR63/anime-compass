import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: get-recommendations (INTELIGENTE)
 * Sistema de recomendações personalizadas com:
 * - Análise profunda do perfil do usuário (até 10 animes)
 * - Algoritmo de scoring considerando gêneros, estúdios e notas
 * - Integração com Lovable AI para explicações personalizadas
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Delay entre requisições para respeitar rate limit da Jikan (3 req/s)
const DELAY_BETWEEN_REQUESTS = 400;

// Ratings e tipos a serem filtrados
const EXCLUDED_RATINGS = ["Rx - Hentai"];
const EXCLUDED_TYPES = ["Music", "CM", "PV"];

// Interfaces para tipagem
interface UserAnimeEntry {
  mal_id: number;
  title: string;
  status: string;
  rating: number | null;
  image_url: string | null;
}

interface GenreData {
  id: number;
  name: string;
  count: number;
  weight: number; // Peso baseado nas notas
}

interface StudioData {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

interface UserProfile {
  topGenres: GenreData[];
  topStudios: StudioData[];
  avgRating: number;
  preferredTypes: string[];
  favoriteAnimes: { title: string; rating: number }[];
}

interface SmartRecommendation {
  anime: any;
  matchScore: number;
  reasons: {
    genres: string[];
    studio: string | null;
    similarity: string | null;
    aiExplanation: string;
  };
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Cria delay para rate limiting
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
 * Filtra animes indesejados (adultos, músicas, etc.)
 */
const filterAnimes = (animes: any[]): any[] => {
  return animes.filter(anime => {
    if (anime.rating && EXCLUDED_RATINGS.includes(anime.rating)) return false;
    if (anime.type && EXCLUDED_TYPES.includes(anime.type)) return false;
    return true;
  });
};

/**
 * Analisa o perfil do usuário e extrai preferências
 */
async function analyzeUserProfile(userAnimes: UserAnimeEntry[]): Promise<UserProfile> {
  const genreCounts = new Map<number, GenreData>();
  const studioCounts = new Map<number, { id: number; name: string; ratings: number[] }>();
  const typeCounts = new Map<string, number>();
  
  // Pega os top 10 animes com melhor nota para análise
  const topAnimes = userAnimes
    .filter(a => a.rating && Number(a.rating) >= 6)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 10);

  const animesToAnalyze = topAnimes.length >= 3 ? topAnimes : userAnimes.slice(0, 10);
  
  console.log(`[Profile] Analisando ${animesToAnalyze.length} animes do usuário`);

  // Busca detalhes de cada anime para extrair gêneros e estúdios
  for (const anime of animesToAnalyze) {
    try {
      await delay(DELAY_BETWEEN_REQUESTS);
      
      const response = await fetchWithRetry(`${JIKAN_BASE_URL}/anime/${anime.mal_id}`);
      if (response.ok) {
        const data = await response.json();
        const animeData = data.data;
        const userRating = Number(anime.rating) || 7;
        const ratingWeight = userRating >= 9 ? 3 : userRating >= 8 ? 2 : 1;
        
        // Processa gêneros com peso baseado na nota
        const genres = animeData?.genres || [];
        for (const genre of genres) {
          const existing = genreCounts.get(genre.mal_id);
          if (existing) {
            existing.count++;
            existing.weight += ratingWeight;
          } else {
            genreCounts.set(genre.mal_id, {
              id: genre.mal_id,
              name: genre.name,
              count: 1,
              weight: ratingWeight
            });
          }
        }
        
        // Processa estúdios
        const studios = animeData?.studios || [];
        for (const studio of studios) {
          const existing = studioCounts.get(studio.mal_id);
          if (existing) {
            existing.ratings.push(userRating);
          } else {
            studioCounts.set(studio.mal_id, {
              id: studio.mal_id,
              name: studio.name,
              ratings: [userRating]
            });
          }
        }
        
        // Processa tipos
        if (animeData?.type) {
          typeCounts.set(animeData.type, (typeCounts.get(animeData.type) || 0) + 1);
        }
      }
    } catch (e) {
      console.warn(`[Profile] Erro ao buscar anime ${anime.mal_id}:`, e);
    }
  }

  // Ordena gêneros por peso (considerando nota)
  const topGenres = Array.from(genreCounts.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  // Ordena estúdios por média de nota
  const topStudios = Array.from(studioCounts.values())
    .map(s => ({
      id: s.id,
      name: s.name,
      count: s.ratings.length,
      avgRating: s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length
    }))
    .filter(s => s.count >= 2) // Apenas estúdios com 2+ animes
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 3);

  // Tipos preferidos
  const preferredTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type]) => type);

  // Calcula média de rating
  const ratedAnimes = animesToAnalyze.filter(a => a.rating);
  const avgRating = ratedAnimes.length > 0
    ? ratedAnimes.reduce((sum, a) => sum + Number(a.rating), 0) / ratedAnimes.length
    : 7;

  // Animes favoritos para contexto da IA
  const favoriteAnimes = animesToAnalyze
    .filter(a => Number(a.rating) >= 8)
    .slice(0, 5)
    .map(a => ({ title: a.title, rating: Number(a.rating) }));

  console.log(`[Profile] Gêneros: ${topGenres.map(g => g.name).join(', ')}`);
  console.log(`[Profile] Estúdios: ${topStudios.map(s => s.name).join(', ')}`);

  return {
    topGenres,
    topStudios,
    avgRating,
    preferredTypes,
    favoriteAnimes
  };
}

/**
 * Calcula score de compatibilidade entre anime e perfil do usuário
 */
function calculateMatchScore(anime: any, profile: UserProfile): { score: number; matchedGenres: string[]; matchedStudio: string | null } {
  let score = 0;
  const matchedGenres: string[] = [];
  let matchedStudio: string | null = null;

  // Score base do anime no MAL (0-30 pontos)
  const malScore = anime.score || 0;
  score += (malScore / 10) * 30;

  // Compatibilidade de gêneros (0-40 pontos)
  const animeGenres = anime.genres?.map((g: any) => g.mal_id) || [];
  const profileGenreIds = profile.topGenres.map(g => g.id);
  
  for (const genreId of animeGenres) {
    const profileGenre = profile.topGenres.find(g => g.id === genreId);
    if (profileGenre) {
      // Peso maior para gêneros mais bem avaliados
      score += Math.min(8, profileGenre.weight * 2);
      matchedGenres.push(profileGenre.name);
    }
  }

  // Compatibilidade de estúdio (0-20 pontos)
  const animeStudios = anime.studios?.map((s: any) => s.mal_id) || [];
  for (const studioId of animeStudios) {
    const profileStudio = profile.topStudios.find(s => s.id === studioId);
    if (profileStudio) {
      score += Math.min(20, profileStudio.avgRating * 2);
      matchedStudio = profileStudio.name;
      break;
    }
  }

  // Bônus por popularidade (0-10 pontos)
  const popularity = anime.members || 0;
  if (popularity > 1000000) score += 10;
  else if (popularity > 500000) score += 7;
  else if (popularity > 100000) score += 5;

  // Normaliza para 0-100
  return { 
    score: Math.min(100, Math.round(score)), 
    matchedGenres,
    matchedStudio
  };
}

/**
 * Gera explicação personalizada usando Lovable AI
 */
async function generateAIExplanation(
  recommendation: any,
  profile: UserProfile,
  matchedGenres: string[],
  matchedStudio: string | null
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.warn("[AI] LOVABLE_API_KEY não configurada, usando explicação genérica");
    return generateFallbackExplanation(matchedGenres, matchedStudio);
  }

  try {
    const favoritesContext = profile.favoriteAnimes
      .map(a => `${a.title} (nota ${a.rating})`)
      .join(', ');

    const prompt = `Você é um especialista em animes. Gere uma explicação curta (máximo 2 frases) e persuasiva de por que o usuário deveria assistir "${recommendation.title}".

Contexto do usuário:
- Animes favoritos: ${favoritesContext}
- Gêneros favoritos: ${profile.topGenres.map(g => g.name).join(', ')}
${matchedStudio ? `- Estúdio favorito encontrado: ${matchedStudio}` : ''}

Anime recomendado: ${recommendation.title}
- Gêneros: ${(recommendation.genres || []).map((g: any) => g.name).join(', ')}
- Estúdios: ${(recommendation.studios || []).map((s: any) => s.name).join(', ')}
- Sinopse: ${recommendation.synopsis?.substring(0, 200) || 'N/A'}

Gere uma explicação personalizada e empolgante em português brasileiro. Não use markdown.`;

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em animes que faz recomendações personalizadas. Seja conciso e empolgante." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Erro na API: ${response.status} - ${errorText}`);
      return generateFallbackExplanation(matchedGenres, matchedStudio);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content?.trim();
    
    return explanation || generateFallbackExplanation(matchedGenres, matchedStudio);
  } catch (error) {
    console.error("[AI] Erro ao gerar explicação:", error);
    return generateFallbackExplanation(matchedGenres, matchedStudio);
  }
}

/**
 * Gera explicação de fallback quando IA não está disponível
 */
function generateFallbackExplanation(matchedGenres: string[], matchedStudio: string | null): string {
  if (matchedStudio && matchedGenres.length > 0) {
    return `Do estúdio ${matchedStudio} que você curte, combinando ${matchedGenres.slice(0, 2).join(' e ')} que são seus gêneros favoritos!`;
  }
  if (matchedGenres.length > 0) {
    return `Perfeito para você que adora ${matchedGenres.slice(0, 2).join(' e ')}! Uma escolha certeira baseada no seu histórico.`;
  }
  if (matchedStudio) {
    return `Do estúdio ${matchedStudio} que produziu animes que você amou. Vale muito a pena conferir!`;
  }
  return `Altamente recomendado pela comunidade e combina com seu perfil de fã de anime!`;
}

/**
 * Determina nível de confiança da recomendação
 */
function getConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

// Edge function principal
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Autenticação
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch?.[1]?.trim();

    if (!token) {
      console.error("[Recommendations] Header de autorização sem token Bearer válido");
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("[Recommendations] Erro ao validar usuário:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado ou sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[Recommendations] Usuário autenticado: ${user.id}`);

    // Busca animes do usuário com título
    const { data: userAnimes, error: animesError } = await supabase
      .from("anime_entries")
      .select("mal_id, title, status, rating, image_url")
      .eq("user_id", user.id)
      .in("status", ["completed", "watching"])
      .order("rating", { ascending: false, nullsFirst: false });

    if (animesError) {
      console.error("[Recommendations] Erro ao buscar animes:", animesError);
      throw new Error("Erro ao buscar animes do usuário");
    }

    if (!userAnimes || userAnimes.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          topGenres: [],
          topStudios: [],
          message: "Adicione animes à sua lista para receber recomendações personalizadas!"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMalIds = new Set(userAnimes.map(a => a.mal_id));

    // ETAPA 1: Analisar perfil do usuário
    console.log("[Recommendations] Analisando perfil do usuário...");
    const userProfile = await analyzeUserProfile(userAnimes as UserAnimeEntry[]);

    // Se não conseguiu identificar gêneros, usar populares
    const genresToSearch = userProfile.topGenres.length > 0 
      ? userProfile.topGenres 
      : [{ id: 1, name: 'Action', count: 1, weight: 1 }, { id: 2, name: 'Adventure', count: 1, weight: 1 }];

    // ETAPA 2: Buscar recomendações baseadas no perfil
    console.log("[Recommendations] Buscando animes compatíveis...");
    const candidateAnimes: any[] = [];
    const seenIds = new Set<number>();

    // Busca por gêneros principais
    for (const genre of genresToSearch.slice(0, 3)) {
      try {
        await delay(DELAY_BETWEEN_REQUESTS);
        
        const response = await fetchWithRetry(
          `${JIKAN_BASE_URL}/anime?genres=${genre.id}&order_by=score&sort=desc&limit=10&sfw=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          const animes = filterAnimes(data.data || []);
          
          for (const anime of animes) {
            if (!userMalIds.has(anime.mal_id) && !seenIds.has(anime.mal_id)) {
              seenIds.add(anime.mal_id);
              candidateAnimes.push(anime);
            }
          }
        }
      } catch (e) {
        console.warn(`[Recommendations] Erro ao buscar gênero ${genre.name}:`, e);
      }
    }

    // Busca por estúdios favoritos
    for (const studio of userProfile.topStudios.slice(0, 2)) {
      try {
        await delay(DELAY_BETWEEN_REQUESTS);
        
        const response = await fetchWithRetry(
          `${JIKAN_BASE_URL}/anime?producers=${studio.id}&order_by=score&sort=desc&limit=8&sfw=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          const animes = filterAnimes(data.data || []);
          
          for (const anime of animes) {
            if (!userMalIds.has(anime.mal_id) && !seenIds.has(anime.mal_id)) {
              seenIds.add(anime.mal_id);
              candidateAnimes.push(anime);
            }
          }
        }
      } catch (e) {
        console.warn(`[Recommendations] Erro ao buscar estúdio ${studio.name}:`, e);
      }
    }

    // ETAPA 3: Calcular scores e ordenar
    console.log(`[Recommendations] Calculando compatibilidade para ${candidateAnimes.length} animes...`);
    
    const scoredRecommendations = candidateAnimes.map(anime => {
      const { score, matchedGenres, matchedStudio } = calculateMatchScore(anime, userProfile);
      return { anime, score, matchedGenres, matchedStudio };
    });

    // Ordena por score e pega top 12
    const topRecommendations = scoredRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    // ETAPA 4: Gerar explicações com IA para os top 6
    console.log("[Recommendations] Gerando explicações personalizadas...");
    
    const smartRecommendations: SmartRecommendation[] = [];
    
    for (let i = 0; i < topRecommendations.length; i++) {
      const rec = topRecommendations[i];
      
      // Gera explicação IA apenas para os top 6
      let aiExplanation = generateFallbackExplanation(rec.matchedGenres, rec.matchedStudio);
      if (i < 6) {
        aiExplanation = await generateAIExplanation(
          rec.anime,
          userProfile,
          rec.matchedGenres,
          rec.matchedStudio
        );
        // Pequeno delay para não sobrecarregar a API
        await delay(100);
      }

      smartRecommendations.push({
        anime: rec.anime,
        matchScore: rec.score,
        reasons: {
          genres: rec.matchedGenres,
          studio: rec.matchedStudio,
          similarity: rec.matchedGenres.length > 0 
            ? `Combina com seu gosto por ${rec.matchedGenres[0]}`
            : null,
          aiExplanation
        },
        confidence: getConfidence(rec.score)
      });
    }

    console.log(`[Recommendations] Retornando ${smartRecommendations.length} recomendações inteligentes`);

    return new Response(
      JSON.stringify({ 
        recommendations: smartRecommendations,
        topGenres: userProfile.topGenres.slice(0, 3),
        topStudios: userProfile.topStudios,
        userStats: {
          analyzedAnimes: userAnimes.length,
          avgRating: userProfile.avgRating.toFixed(1),
          favoriteGenres: userProfile.topGenres.map(g => g.name).slice(0, 3)
        }
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
