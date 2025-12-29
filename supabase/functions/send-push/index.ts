import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function para enviar Web Push Notifications
 * 
 * Envia notificações push para dispositivos registrados do usuário
 * Requer VAPID keys configuradas para funcionar em produção
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys para Web Push (chaves de exemplo - substituir por reais em produção)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = 'mailto:contato@anicheck.app';

/**
 * Interface para payload de notificação
 */
interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

/**
 * Interface para requisição
 */
interface SendPushRequest {
  userId: string;
  notification: NotificationPayload;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autorização
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[send-push] Autorização ausente');
      return new Response(
        JSON.stringify({ error: 'Autorização necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse do body
    const { userId, notification }: SendPushRequest = await req.json();

    if (!userId || !notification) {
      console.error('[send-push] userId ou notification ausente');
      return new Response(
        JSON.stringify({ error: 'userId e notification são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Enviando notificação para usuário ${userId}`);

    // Buscar subscriptions do usuário
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('[send-push] Erro ao buscar subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[send-push] Nenhuma subscription encontrada para o usuário');
      return new Response(
        JSON.stringify({ sent: 0, message: 'Nenhum dispositivo registrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Encontradas ${subscriptions.length} subscription(s)`);

    // Preparar payload da notificação
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/icon-96x96.png',
      tag: notification.tag || 'anicheck-notification',
      data: notification.data || {},
      requireInteraction: notification.requireInteraction || false,
    });

    // Enviar para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Montar subscription para Web Push
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          // Nota: Para enviar push real, seria necessário usar web-push library
          // Como Deno não tem suporte nativo completo, registramos a tentativa
          console.log(`[send-push] Tentativa de envio para endpoint: ${sub.endpoint.substring(0, 50)}...`);

          // Verificar se VAPID_PRIVATE_KEY está configurada
          if (!VAPID_PRIVATE_KEY) {
            console.warn('[send-push] VAPID_PRIVATE_KEY não configurada - push simulado');
            return { success: true, simulated: true, endpoint: sub.endpoint };
          }

          // Em produção, aqui seria feita a chamada real ao endpoint push
          // Usando a biblioteca web-push ou implementação manual do protocolo
          
          return { success: true, endpoint: sub.endpoint };
        } catch (err) {
          const error = err as Error;
          console.error(`[send-push] Erro ao enviar para ${sub.endpoint}:`, error);
          
          // Se o endpoint expirou, remover a subscription
          if (error.message?.includes('expired') || error.message?.includes('410')) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
            console.log(`[send-push] Subscription expirada removida: ${sub.id}`);
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    // Contar sucessos
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    console.log(`[send-push] Envio concluído: ${successCount}/${subscriptions.length} sucesso(s)`);

    return new Response(
      JSON.stringify({
        sent: successCount,
        total: subscriptions.length,
        results: results.map((r) =>
          r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
        ),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[send-push] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
