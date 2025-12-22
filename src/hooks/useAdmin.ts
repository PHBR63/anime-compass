import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Interface para perfil de usuário no painel admin
 */
export interface AdminUserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_public: boolean | null;
  email?: string;
  role?: string;
  anime_count?: number;
  review_count?: number;
  friend_count?: number;
}

/**
 * Interface para logs de auditoria
 */
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    username: string | null;
  };
}

/**
 * Interface para logs de erros
 */
export interface ErrorLog {
  id: string;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  error_context: Record<string, unknown> | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    username: string | null;
  };
}

/**
 * Interface para estatísticas do admin
 */
export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalAnimes: number;
  totalReviews: number;
  totalFriendships: number;
  totalLists: number;
  activeUsersWeek: number;
  totalAuditLogs: number;
  totalErrorLogs: number;
}

/**
 * Hook para verificar se o usuário é admin
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (error) {
        console.error("Erro ao verificar role de admin:", error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para obter estatísticas gerais do admin
 */
export function useAdminStats() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["adminStats"],
    queryFn: async (): Promise<AdminStats> => {
      // Total de usuários
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Novos usuários hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newUsersToday } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Novos usuários na semana
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newUsersWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Total de animes
      const { count: totalAnimes } = await supabase
        .from("anime_entries")
        .select("*", { count: "exact", head: true });

      // Total de reviews
      const { count: totalReviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true });

      // Total de amizades
      const { count: totalFriendships } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted");

      // Total de listas
      const { count: totalLists } = await supabase
        .from("custom_lists")
        .select("*", { count: "exact", head: true });

      // Usuários ativos na semana (baseado em updated_at do perfil)
      const { count: activeUsersWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", weekAgo.toISOString());

      // Total de logs de auditoria
      const { count: totalAuditLogs } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });

      // Total de logs de erros
      const { count: totalErrorLogs } = await supabase
        .from("error_logs")
        .select("*", { count: "exact", head: true });

      return {
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        totalAnimes: totalAnimes || 0,
        totalReviews: totalReviews || 0,
        totalFriendships: totalFriendships || 0,
        totalLists: totalLists || 0,
        activeUsersWeek: activeUsersWeek || 0,
        totalAuditLogs: totalAuditLogs || 0,
        totalErrorLogs: totalErrorLogs || 0,
      };
    },
    enabled: isAdmin === true,
    staleTime: 1000 * 60, // 1 minuto
  });
}

/**
 * Hook para listar todos os usuários (admin)
 */
export function useAdminUsers(searchTerm?: string, roleFilter?: string) {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["adminUsers", searchTerm, roleFilter],
    queryFn: async (): Promise<AdminUserProfile[]> => {
      // Buscar todos os perfis
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`
        );
      }

      const { data: profiles, error } = await query;

      if (error) throw error;

      // Buscar roles para cada usuário
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Buscar contagem de animes por usuário
      const { data: animeCounts } = await supabase
        .from("anime_entries")
        .select("user_id")
        .eq("is_archived", false);

      // Buscar contagem de reviews por usuário
      const { data: reviewCounts } = await supabase
        .from("reviews")
        .select("user_id");

      // Mapear dados
      const usersWithStats = profiles?.map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        const animeCount =
          animeCounts?.filter((a) => a.user_id === profile.id).length || 0;
        const reviewCount =
          reviewCounts?.filter((r) => r.user_id === profile.id).length || 0;

        return {
          ...profile,
          role: userRole?.role || "user",
          anime_count: animeCount,
          review_count: reviewCount,
        };
      });

      // Filtrar por role se especificado
      if (roleFilter && roleFilter !== "all") {
        return (
          usersWithStats?.filter((u) => u.role === roleFilter) || []
        );
      }

      return usersWithStats || [];
    },
    enabled: isAdmin === true,
  });
}

/**
 * Hook para listar logs de auditoria
 */
export function useAuditLogs(
  page: number = 1,
  pageSize: number = 20,
  actionFilter?: string
) {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["auditLogs", page, pageSize, actionFilter],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (actionFilter && actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Buscar perfis dos usuários
      const userIds = [...new Set(data?.map((log) => log.user_id).filter(Boolean))];
      
      let profiles: Record<string, { display_name: string | null; username: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", userIds as string[]);

        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = { display_name: p.display_name, username: p.username };
          return acc;
        }, {} as Record<string, { display_name: string | null; username: string | null }>);
      }

      const logsWithProfiles = data?.map((log) => ({
        ...log,
        user_profile: log.user_id ? profiles[log.user_id] : undefined,
      }));

      return {
        logs: logsWithProfiles as AuditLog[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: isAdmin === true,
  });
}

/**
 * Hook para listar logs de erros
 */
export function useErrorLogs(page: number = 1, pageSize: number = 20) {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["errorLogs", page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("error_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Buscar perfis dos usuários
      const userIds = [...new Set(data?.map((log) => log.user_id).filter(Boolean))];
      
      let profiles: Record<string, { display_name: string | null; username: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", userIds as string[]);

        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = { display_name: p.display_name, username: p.username };
          return acc;
        }, {} as Record<string, { display_name: string | null; username: string | null }>);
      }

      const logsWithProfiles = data?.map((log) => ({
        ...log,
        user_profile: log.user_id ? profiles[log.user_id] : undefined,
      }));

      return {
        logs: logsWithProfiles as ErrorLog[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: isAdmin === true,
  });
}

/**
 * Hook para promover/rebaixar usuários
 */
export function useSetUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "moderator" | "user";
    }) => {
      const { data, error } = await supabase.rpc("admin_set_user_role", {
        p_target_user_id: userId,
        p_new_role: role,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
      toast.success("Role do usuário atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar role: " + error.message);
    },
  });
}

/**
 * Hook para remover role de usuário
 */
export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "moderator" | "user";
    }) => {
      const { data, error } = await supabase.rpc("admin_remove_user_role", {
        p_target_user_id: userId,
        p_role: role,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
      toast.success("Role removido com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover role: " + error.message);
    },
  });
}

/**
 * Função para registrar erro no banco (chamada global)
 */
export async function logErrorToDatabase(
  errorMessage: string,
  errorStack?: string,
  errorContext?: Record<string, unknown>
) {
  try {
    await supabase.rpc("log_error", {
      p_error_message: errorMessage,
      p_error_stack: errorStack || null,
      p_error_context: errorContext ? JSON.parse(JSON.stringify(errorContext)) : null,
      p_url: window.location.href,
      p_user_agent: navigator.userAgent,
    });
  } catch (e) {
    console.error("Falha ao registrar erro no banco:", e);
  }
}
