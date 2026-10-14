import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Protege o endpoint sem transporte Web Push; não acessa inscrições nem finge entregar notificações. */
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  const access = await requireAdmin(req);
  return new Response(JSON.stringify({
    success: false,
    error: access.status === 200 ? "O envio Web Push ainda não está configurado. Nenhuma notificação foi enviada." : access.error,
  }), {
    status: access.status === 200 ? 501 : access.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
