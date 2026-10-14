/** Dependências de autenticação injetáveis para testar autorização sem acessar produção. */
export interface AuthorizationDependencies {
  getUser: (token: string) => Promise<string | null>;
  isAdmin: (userId: string) => Promise<boolean>;
  getCronHash: (name: string) => Promise<string | null>;
}
export type AccessResult = { status: 200; userId: string | null } | { status: 401 | 403 | 503; error: string };

/** Verifica sessão/admin ou token de um agendamento específico; qualquer falha bloqueia a operação. */
export async function authorizePrivilegedRequest(
  request: Request, dependencies: AuthorizationDependencies, cronName?: string,
): Promise<AccessResult> {
  try {
    const cronToken = request.headers.get("x-cron-token");
    if (cronToken) {
      if (!cronName) return { status: 401, error: "Agendamento não autorizado" };
      const expected = await dependencies.getCronHash(cronName);
      const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cronToken)));
      const actual = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
      if (!expected || expected.length !== actual.length) return { status: 401, error: "Agendamento não autorizado" };
      let difference = 0;
      for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
      return difference === 0 ? { status: 200, userId: null } : { status: 401, error: "Agendamento não autorizado" };
    }
    const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return { status: 401, error: "Entre na sua conta" };
    const userId = await dependencies.getUser(token);
    if (!userId) return { status: 401, error: "Entre na sua conta" };
    if (!await dependencies.isAdmin(userId)) return { status: 403, error: "Acesso restrito a administradores" };
    return { status: 200, userId };
  } catch {
    return { status: 503, error: "Não foi possível verificar a autorização" };
  }
}
