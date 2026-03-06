import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: get-recommendations
 * Sistema de recomendações personalizadas com:
 * - Análise profunda do perfil do usuário (até 10 animes)
 * - Algoritmo de scoring considerando gêneros, estúdios e notas
 * - Enriquecimento com catálogo local (imagens e sinopse PT-BR)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";

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
  weight: number;
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

interface NormalizedAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  image_url: string | null;
  local_image_url: string | null;
  score: number | null;
  episodes: number | null;
  year: number | null;
  season: string | null;
  status: string | null;
  type: string | null;
  rating: string | null;
  synopsis: string | null;
  synopsis_pt: string | null;
  genres: string[];
  studios: string[];
  members: number | null;
  popularity: number | null;
  rank: number | null;
}

interface SmartRecommendation {
  anime: NormalizedAnime;
  matchScore: number;
  reasons: {
    genres: string[];
    studio: string | null;
    similarity: string | null;
    aiExplanation: string;
  };
  confidence: 'high' | 'medium' | 'low';
}

/** Cria delay para rate limiting */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Busca com retry e tratamento de rate limit */
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

/** Filtra animes indesejados (adultos, músicas, etc.) */
const filterAnimes = (animes: any[]): any[] => {
  return animes.filter(anime => {
    if (anime.rating && EXCLUDED_RATINGS.includes(anime.rating)) return false;
    if (anime.type && EXCLUDED_TYPES.includes(anime.type)) return false;
    return true;
  });
};

/**
 * Normaliza dados do Jikan para o formato CatalogAnime esperado pelo frontend.
 * Se existir no catálogo local, prioriza imagens e sinopse locais.
 */
function normalizeJikanToCatalog(jikanAnime: any, catalogEntry?: any): NormalizedAnime {
  const normalized: NormalizedAnime = {
    mal_id: jikanAnime.mal_id,
    title: jikanAnime.title || '',
    title_english: jikanAnime.title_english || null,
    title_japanese: jikanAnime.title_japanese || null,
    image_url: jikanAnime.images?.jpg?.large_image_url || jikanAnime.images?.jpg?.image_url || null,
    local_image_url: null,
    score: jikanAnime.score || null,
    episodes: jikanAnime.episodes || null,
    year: jikanAnime.year || null,
    season: jikanAnime.season || null,
    status: jikanAnime.status || null,
    type: jikanAnime.type || null,
    rating: jikanAnime.rating || null,
    synopsis: jikanAnime.synopsis || null,
    synopsis_pt: null,
    genres: (jikanAnime.genres || []).map((g: any) => g.name),
    studios: (jikanAnime.studios || []).map((s: any) => s.name),
    members: jikanAnime.members || null,
    popularity: jikanAnime.popularity || null,
    rank: jikanAnime.rank || null,
  };

  // Sobrescreve com dados do catálogo local se disponível
  if (catalogEntry) {
    normalized.local_image_url = catalogEntry.local_image_url || null;
    normalized.image_url = catalogEntry.image_url || normalized.image_url;
    normalized.synopsis_pt = catalogEntry.synopsis_pt || null;
    normalized.title_english = catalogEntry.title_english || normalized.title_english;
    normalized.title_japanese = catalogEntry.title_japanese || normalized.title_japanese;
  }

  return normalized;
}

/** Analisa o perfil do usuário e extrai preferências */
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
        for (const genre of (animeData?.genres || [])) {
          const existing = genreCounts.get(genre.mal_id);
          if (existing) {
            existing.count++;
            existing.weight += ratingWeight;
          } else {
            genreCounts.set(genre.mal_id, { id: genre.mal_id, name: genre.name, count: 1, weight: ratingWeight });
          }
        }

        // Processa estúdios
        for (const studio of (animeData?.studios || [])) {
          const existing = studioCounts.get(studio.mal_id);
          if (existing) {
            existing.ratings.push(userRating);
          } else {
            studioCounts.set(studio.mal_id, { id: studio.mal_id, name: studio.name, ratings: [userRating] });
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

  const topGenres = Array.from(genreCounts.values()).sort((a, b) => b.weight - a.weight).slice(0, 5);
  const topStudios = Array.from(studioCounts.values())
    .map(s => ({ id: s.id, name: s.name, count: s.ratings.length, avgRating: s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length }))
    .filter(s => s.count >= 2)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 3);

  const preferredTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([type]) => type);
  const ratedAnimes = animesToAnalyze.filter(a => a.rating);
  const avgRating = ratedAnimes.length > 0 ? ratedAnimes.reduce((sum, a) => sum + Number(a.rating), 0) / ratedAnimes.length : 7;
  const favoriteAnimes = animesToAnalyze.filter(a => Number(a.rating) >= 8).slice(0, 5).map(a => ({ title: a.title, rating: Number(a.rating) }));

  console.log(`[Profile] Gêneros: ${topGenres.map(g => g.name).join(', ')}`);
  console.log(`[Profile] Estúdios: ${topStudios.map(s => s.name).join(', ')}`);

  return { topGenres, topStudios, avgRating, preferredTypes, favoriteAnimes };
}

/** Calcula score de compatibilidade entre anime e perfil do usuário */
function calculateMatchScore(anime: any, profile: UserProfile): { score: number; matchedGenres: string[]; matchedStudio: string | null } {
  let score = 0;
  const matchedGenres: string[] = [];
  let matchedStudio: string | null = null;

  // Score base do anime no MAL (0-30 pontos)
  score += ((anime.score || 0) / 10) * 30;

  // Compatibilidade de gêneros (0-40 pontos)
  const animeGenres = anime.genres?.map((g: any) => g.mal_id) || [];
  for (const genreId of animeGenres) {
    const profileGenre = profile.topGenres.find(g => g.id === genreId);
    if (profileGenre) {
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

  return { score: Math.min(100, Math.round(score)), matchedGenres, matchedStudio };
}

/** Gera explicação personalizada (baseada em regras) */
function generateExplanation(matchedGenres: string[], matchedStudio: string | null): string {
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

/** Determina nível de confiança da recomendação */
function getConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Busca dados do catálogo local para uma lista de mal_ids.
 * Retorna um Map de mal_id -> catalogEntry.
 */
async function fetchCatalogEntries(supabase: any, malIds: number[]): Promise<Map<number, any>> {
  const catalogMap = new Map<number, any>();
  if (malIds.length === 0) return catalogMap;

  try {
    const { data, error } = await supabase
      .from("anime_catalog")
      .select("mal_id, image_url, local_image_url, synopsis_pt, title_english, title_japanese")
      .in("mal_id", malIds);

    if (!error && data) {
      for (const entry of data) {
        catalogMap.set(entry.mal_id, entry);
      }
    }
    console.log(`[Catalog] Encontrados ${catalogMap.size}/${malIds.length} animes no catálogo local`);
  } catch (e) {
    console.warn("[Catalog] Erro ao buscar catálogo local:", e);
  }

  return catalogMap;
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
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado ou sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Recommendations] Usuário autenticado: ${user.id}`);

    // Busca animes do usuário
    const { data: userAnimes, error: animesError } = await supabase
      .from("anime_entries")
      .select("mal_id, title, status, rating, image_url")
      .eq("user_id", user.id)
      .in("status", ["completed", "watching"])
      .order("rating", { ascending: false, nullsFirst: false });

    if (animesError) throw new Error("Erro ao buscar animes do usuário");

    if (!userAnimes || userAnimes.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [], topGenres: [], topStudios: [], message: "Adicione animes à sua lista para receber recomendações personalizadas!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMalIds = new Set(userAnimes.map(a => a.mal_id));

    // ETAPA 1: Analisar perfil do usuário
    console.log("[Recommendations] Analisando perfil do usuário...");
    const userProfile = await analyzeUserProfile(userAnimes as UserAnimeEntry[]);

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
        const response = await fetchWithRetry(`${JIKAN_BASE_URL}/anime?genres=${genre.id}&order_by=score&sort=desc&limit=10&sfw=true`);
        if (response.ok) {
          const data = await response.json();
          for (const anime of filterAnimes(data.data || [])) {
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
        const response = await fetchWithRetry(`${JIKAN_BASE_URL}/anime?producers=${studio.id}&order_by=score&sort=desc&limit=8&sfw=true`);
        if (response.ok) {
          const data = await response.json();
          for (const anime of filterAnimes(data.data || [])) {
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
    const scoredRecommendations = candidateAnimes
      .map(anime => {
        const { score, matchedGenres, matchedStudio } = calculateMatchScore(anime, userProfile);
        return { anime, score, matchedGenres, matchedStudio };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    // ETAPA 4: Enriquecer com catálogo local
    const candidateMalIds = scoredRecommendations.map(r => r.anime.mal_id);
    const catalogMap = await fetchCatalogEntries(supabase, candidateMalIds);

    // ETAPA 5: Normalizar e montar resposta
    console.log("[Recommendations] Normalizando dados e gerando explicações...");
    const smartRecommendations: SmartRecommendation[] = scoredRecommendations.map(rec => {
      const catalogEntry = catalogMap.get(rec.anime.mal_id);
      const normalizedAnime = normalizeJikanToCatalog(rec.anime, catalogEntry);

      return {
        anime: normalizedAnime,
        matchScore: rec.score,
        reasons: {
          genres: rec.matchedGenres,
          studio: rec.matchedStudio,
          similarity: rec.matchedGenres.length > 0 ? `Combina com seu gosto por ${rec.matchedGenres[0]}` : null,
          aiExplanation: generateExplanation(rec.matchedGenres, rec.matchedStudio),
        },
        confidence: getConfidence(rec.score),
      };
    });

    console.log(`[Recommendations] Retornando ${smartRecommendations.length} recomendações (${catalogMap.size} enriquecidas com catálogo local)`);

    return new Response(
      JSON.stringify({
        recommendations: smartRecommendations,
        topGenres: userProfile.topGenres.slice(0, 3),
        topStudios: userProfile.topStudios,
        userStats: {
          analyzedAnimes: userAnimes.length,
          avgRating: userProfile.avgRating.toFixed(1),
          favoriteGenres: userProfile.topGenres.map(g => g.name).slice(0, 3),
        },
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
