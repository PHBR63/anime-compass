import { requireAdmin } from "../_shared/adminAuth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function para limpeza automática de logs antigos
 * Remove logs de erros com mais de 30 dias
 * Deve ser executada via cron job diariamente
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Impede acesso privilegiado sem papel admin ou token do agendamento.
  const access = await requireAdmin(req, "cleanup_logs");
  if (access.status !== 200) {
    return new Response(JSON.stringify({ success: false, error: access.error }), {
      status: access.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("🧹 Iniciando limpeza de logs antigos...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Usar service role key para ter permissão de deletar
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calcular data de 30 dias atrás
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`📅 Deletando logs anteriores a: ${cutoffDate}`);

    // Contar logs antes de deletar
    const { count: errorLogsBefore } = await supabase
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .lt("created_at", cutoffDate);

    const { count: auditLogsBefore } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .lt("created_at", cutoffDate);

    console.log(`🔍 Logs de erro a deletar: ${errorLogsBefore || 0}`);
    console.log(`🔍 Logs de auditoria a deletar: ${auditLogsBefore || 0}`);

    // Deletar logs de erro antigos
    const { error: errorLogsError } = await supabase
      .from("error_logs")
      .delete()
      .lt("created_at", cutoffDate);

    if (errorLogsError) {
      console.error("❌ Erro ao deletar error_logs:", errorLogsError);
      throw errorLogsError;
    }

    // Deletar logs de auditoria antigos (opcional - pode querer manter mais tempo)
    // Comentado por padrão - descomente se quiser limpar também
    /*
    const { error: auditLogsError } = await supabase
      .from("audit_logs")
      .delete()
      .lt("created_at", cutoffDate);

    if (auditLogsError) {
      console.error("❌ Erro ao deletar audit_logs:", auditLogsError);
      throw auditLogsError;
    }
    */

    const result = {
      success: true,
      deleted: {
        error_logs: errorLogsBefore || 0,
        audit_logs: 0, // auditLogsBefore || 0 se ativar deleção
      },
      cutoff_date: cutoffDate,
      executed_at: new Date().toISOString(),
    };

    console.log("✅ Limpeza concluída:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro na limpeza de logs:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
