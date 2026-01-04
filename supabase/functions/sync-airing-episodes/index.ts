/**
 * Edge Function: sync-airing-episodes
 * Sincroniza o número de episódios de animes "Currently Airing"
 * quando a informação fica disponível na API do MAL (via Jikan)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações
const JIKAN_API_URL = 'https://api.jikan.moe/v4';
const BATCH_SIZE = 10; // Quantidade de animes por lote
const DELAY_BETWEEN_REQUESTS = 1200; // 1.2s entre requisições (rate limit do Jikan)
const MAX_ANIMES_PER_RUN = 50; // Máximo de animes para sincronizar por execução

/**
 * Aguarda um tempo determinado (para respeitar rate limits)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Busca detalhes de um anime na API Jikan
 */
async function fetchAnimeFromJikan(malId: number): Promise<{ episodes: number | null; status: string } | null> {
  try {
    const response = await fetch(`${JIKAN_API_URL}/anime/${malId}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log(`[sync-airing] Rate limit atingido, aguardando...`);
        await delay(5000);
        return null;
      }
      console.log(`[sync-airing] Erro ao buscar mal_id ${malId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      episodes: data.data?.episodes || null,
      status: data.data?.status || 'Unknown',
    };
  } catch (error) {
    console.error(`[sync-airing] Erro ao buscar mal_id ${malId}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Trata preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-airing] Iniciando sincronização de episódios...');

    // Cria cliente Supabase com service role para bypass de RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca animes "Currently Airing" sem número de episódios definido
    // OU animes que podem ter atualizado o número de episódios
    const { data: airingAnimes, error: fetchError } = await supabase
      .from('anime_catalog')
      .select('id, mal_id, title, episodes, status')
      .eq('status', 'Currently Airing')
      .or('episodes.is.null,episodes.eq.0')
      .order('popularity', { ascending: true, nullsFirst: false })
      .limit(MAX_ANIMES_PER_RUN);

    if (fetchError) {
      console.error('[sync-airing] Erro ao buscar animes:', fetchError);
      throw fetchError;
    }

    if (!airingAnimes || airingAnimes.length === 0) {
      console.log('[sync-airing] Nenhum anime em exibição sem episódios encontrado.');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum anime para sincronizar',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-airing] Encontrados ${airingAnimes.length} animes para verificar`);

    // Processa animes em lotes
    const results = {
      checked: 0,
      updated: 0,
      errors: 0,
      statusChanged: 0,
    };

    for (let i = 0; i < airingAnimes.length; i++) {
      const anime = airingAnimes[i];
      results.checked++;

      // Busca dados atualizados do Jikan
      const jikanData = await fetchAnimeFromJikan(anime.mal_id);
      
      if (!jikanData) {
        results.errors++;
        await delay(DELAY_BETWEEN_REQUESTS);
        continue;
      }

      // Verifica se há atualização a fazer
      const updates: Record<string, unknown> = {};
      
      // Atualiza episódios se disponível
      if (jikanData.episodes && jikanData.episodes !== anime.episodes) {
        updates.episodes = jikanData.episodes;
        console.log(`[sync-airing] ${anime.title}: episódios ${anime.episodes || 'null'} -> ${jikanData.episodes}`);
      }

      // Atualiza status se mudou (ex: terminou de exibir)
      if (jikanData.status !== anime.status) {
        updates.status = jikanData.status;
        results.statusChanged++;
        console.log(`[sync-airing] ${anime.title}: status ${anime.status} -> ${jikanData.status}`);
      }

      // Se há atualizações, salva no banco
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('anime_catalog')
          .update(updates)
          .eq('id', anime.id);

        if (updateError) {
          console.error(`[sync-airing] Erro ao atualizar ${anime.title}:`, updateError);
          results.errors++;
        } else {
          results.updated++;
          
          // Se episódios foram atualizados, notifica usuários que estão assistindo
          if (updates.episodes) {
            const { data: watchingUsers, error: usersError } = await supabase
              .from('anime_entries')
              .select('user_id')
              .eq('mal_id', anime.mal_id)
              .eq('status', 'watching');

            if (usersError) {
              console.error(`[sync-airing] Erro ao buscar usuários assistindo ${anime.title}:`, usersError);
            } else if (watchingUsers && watchingUsers.length > 0) {
              console.log(`[sync-airing] Notificando ${watchingUsers.length} usuários sobre ${anime.title}`);
              
              // Cria notificações para cada usuário
              const notifications = watchingUsers.map(entry => ({
                user_id: entry.user_id,
                type: 'system' as const,
                title: 'Total de episódios atualizado!',
                message: `${anime.title} agora tem ${updates.episodes} episódios confirmados.`,
                data: {
                  mal_id: anime.mal_id,
                  anime_title: anime.title,
                  old_episodes: anime.episodes,
                  new_episodes: updates.episodes,
                },
              }));

              const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications);

              if (notifError) {
                console.error(`[sync-airing] Erro ao criar notificações:`, notifError);
              } else {
                console.log(`[sync-airing] ${notifications.length} notificações criadas`);
              }
            }
          }
        }
      }

      // Respeita rate limit entre requisições
      if (i < airingAnimes.length - 1) {
        await delay(DELAY_BETWEEN_REQUESTS);
      }
    }

    console.log(`[sync-airing] Sincronização concluída:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-airing] Erro na sincronização:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
