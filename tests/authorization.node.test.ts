import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizePrivilegedRequest, type AuthorizationDependencies } from "../supabase/functions/_shared/authorization.ts";

const dependencies: AuthorizationDependencies = {
  getUser: async token => token === "valid" ? "user-1" : null,
  isAdmin: async () => true,
  getCronHash: async () => null,
};
const request = (token?: string) => new Request("https://example.test", { headers: token ? { Authorization: "Bearer " + token } : {} });
test("bloqueia anônimo e token inválido", async () => {
  assert.equal((await authorizePrivilegedRequest(request(), dependencies)).status, 401);
  assert.equal((await authorizePrivilegedRequest(request("bad"), dependencies)).status, 401);
});
test("bloqueia usuário comum e autoriza admin validado", async () => {
  assert.equal((await authorizePrivilegedRequest(request("valid"), { ...dependencies, isAdmin: async () => false })).status, 403);
  assert.deepEqual(await authorizePrivilegedRequest(request("valid"), dependencies), { status: 200, userId: "user-1" });
});
test("falha fechada quando a verificação está indisponível", async () => {
  assert.equal((await authorizePrivilegedRequest(request("valid"), { ...dependencies, isAdmin: async () => { throw new Error("offline"); } })).status, 503);
});
test("token cron precisa corresponder à função e ao hash cadastrado", async () => {
  const token = "test-only-token";
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), b => b.toString(16).padStart(2, "0")).join("");
  const cron = new Request("https://example.test", { headers: { "x-cron-token": token } });
  const cronDeps = { ...dependencies, getCronHash: async (name: string) => name === "cleanup_logs" ? hash : null };
  assert.equal((await authorizePrivilegedRequest(cron, cronDeps)).status, 401);
  assert.equal((await authorizePrivilegedRequest(cron, cronDeps, "sync_airing")).status, 401);
  assert.deepEqual(await authorizePrivilegedRequest(cron, cronDeps, "cleanup_logs"), { status: 200, userId: null });
});
