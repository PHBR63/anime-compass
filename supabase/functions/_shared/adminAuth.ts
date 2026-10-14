import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizePrivilegedRequest } from "./authorization.ts";

/** Autoriza funções privilegiadas antes de qualquer leitura/gravação com service role. */
export async function requireAdmin(request: Request, cronName?: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { status: 503 as const, error: "Configuração indisponível" };
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return authorizePrivilegedRequest(request, {
    getUser: async token => {
      const { data, error } = await client.auth.getUser(token);
      if (error) return null;
      return data.user?.id ?? null;
    },
    isAdmin: async userId => {
      const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (error) throw error;
      return data === true;
    },
    getCronHash: async name => {
      const { data, error } = await client.from("cron_token_hashes").select("token_hash").eq("name", name).maybeSingle();
      if (error) throw error;
      return data?.token_hash ?? null;
    },
  }, cronName);
}
