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

    // Calcula os indicadores em uma consulta SQL, sem truncar entradas por paginação.
    const { data: stats, error } = await supabase.rpc('get_site_stats');
    if (error) throw error;

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
