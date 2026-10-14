import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

/** Usa o SDK real com transporte isolado: não consulta nem altera dados em produção. */
test("reset de imagens envia sessão admin e mantém o parâmetro action", async () => {
  let requestUrl = "";
  let requestHeaders = new Headers();
  const client = createClient("https://backend.example.test", "qa-public-key", {
    accessToken: async () => "qa-admin-session",
    global: {
      fetch: async (input, init) => {
        requestUrl = String(input);
        requestHeaders = new Headers(init?.headers);
        assert.equal(init?.method, "GET");
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      },
    },
  });
  const { data, error } = await client.functions.invoke("sync-images?action=reset", { method: "GET" });
  assert.equal(error, null);
  assert.equal(data.success, true);
  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/functions/v1/sync-images");
  assert.equal(url.searchParams.get("action"), "reset");
  assert.equal(requestHeaders.get("Authorization"), "Bearer qa-admin-session");
  assert.equal(requestHeaders.get("apikey"), "qa-public-key");
});
