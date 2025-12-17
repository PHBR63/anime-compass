import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function para buscar estatísticas globais do site
 * Função pública - não requer autenticação
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Tratamento de requisições CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Buscando estatísticas globais do site...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Usar service role para acessar dados agregados
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar total de animes únicos (distinct mal_id)
    const { data: animesData, error: animesError } = await supabase
      .from('anime_entries')
      .select('mal_id')
    
    if (animesError) {
      console.error('Erro ao buscar animes:', animesError)
      throw animesError
    }

    // Calcular animes únicos
    const uniqueAnimes = new Set(animesData?.map(a => a.mal_id) || [])
    const totalAnimes = uniqueAnimes.size

    // Buscar total de episódios assistidos
    const { data: episodesData, error: episodesError } = await supabase
      .from('anime_entries')
      .select('episodes_watched')

    if (episodesError) {
      console.error('Erro ao buscar episódios:', episodesError)
      throw episodesError
    }

    const totalEpisodes = episodesData?.reduce((sum, entry) => sum + (entry.episodes_watched || 0), 0) || 0
    
    // Calcular horas (média de 24 minutos por episódio)
    const totalHours = Math.round((totalEpisodes * 24) / 60)

    // Buscar total de conquistas disponíveis
    const { count: totalAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*', { count: 'exact', head: true })

    if (achievementsError) {
      console.error('Erro ao buscar conquistas:', achievementsError)
      throw achievementsError
    }

    const stats = {
      totalAnimes,
      totalEpisodes,
      totalHours,
      totalAchievements: totalAchievements || 0,
    }

    console.log('Estatísticas calculadas:', stats)

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na edge function get-global-stats:', error)
    
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar estatísticas' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
