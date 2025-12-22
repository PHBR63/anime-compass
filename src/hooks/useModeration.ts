import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

/**
 * Tipos para o sistema de moderação
 */
export type ReportReason = 'spam' | 'inappropriate' | 'spoiler' | 'harassment' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ContentType = 'review' | 'chat_message' | 'profile' | 'anime_entry';
export type ModerationAction = 'hide_review' | 'unhide_review' | 'mark_spoiler' | 'warn_user' | 'temp_ban' | 'unban' | 'resolve_report' | 'dismiss_report';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  content_type: ContentType;
  content_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  reported_user?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface ModerationLog {
  id: string;
  moderator_id: string;
  action: ModerationAction;
  target_type: string;
  target_id: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  moderator?: {
    display_name: string | null;
    username: string | null;
  };
}

export interface ModeratorStats {
  pendingReports: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  totalActions: number;
}

/**
 * Hook para verificar se o usuário é moderador ou admin
 */
export function useIsModerator() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['moderator', 'admin']);

      if (error) {
        console.error('Erro ao verificar role de moderador:', error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!user,
  });
}

/**
 * Hook para obter estatísticas de moderação
 */
export function useModeratorStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moderator-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Buscar denúncias pendentes
      const { count: pendingCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Buscar resolvidas hoje
      const { count: resolvedTodayCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('resolved_at', today.toISOString());

      // Buscar resolvidas esta semana
      const { count: resolvedWeekCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('resolved_at', weekAgo.toISOString());

      // Buscar total de ações de moderação
      const { count: actionsCount } = await supabase
        .from('moderation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('moderator_id', user.id);

      return {
        pendingReports: pendingCount || 0,
        resolvedToday: resolvedTodayCount || 0,
        resolvedThisWeek: resolvedWeekCount || 0,
        totalActions: actionsCount || 0,
      } as ModeratorStats;
    },
    enabled: !!user,
  });
}

/**
 * Hook para listar denúncias
 */
export function useReports(status?: ReportStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', status, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar denúncias:', error);
        throw error;
      }

      // Buscar perfis separadamente
      const reports = data || [];
      const reporterIds = [...new Set(reports.map(r => r.reporter_id))];
      const reportedIds = [...new Set(reports.filter(r => r.reported_user_id).map(r => r.reported_user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', [...reporterIds, ...reportedIds]);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return reports.map(r => ({
        ...r,
        reporter: profileMap.get(r.reporter_id),
        reported_user: r.reported_user_id ? profileMap.get(r.reported_user_id) : null,
      })) as Report[];
    },
    enabled: !!user,
  });
}

/**
 * Hook para listar logs de moderação
 */
export function useModerationLogs(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moderation-logs', limit, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moderation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar logs de moderação:', error);
        throw error;
      }

      // Buscar perfis dos moderadores
      const logs = data || [];
      const modIds = [...new Set(logs.map(l => l.moderator_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', modIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return logs.map(l => ({
        ...l,
        moderator: profileMap.get(l.moderator_id),
      })) as ModerationLog[];
    },
    enabled: !!user,
  });
}

/**
 * Hook para criar uma denúncia
 */
export function useCreateReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      content_type: ContentType;
      content_id: string;
      reported_user_id?: string;
      reason: ReportReason;
      description?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Denúncia enviada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar denúncia:', error);
      toast.error('Erro ao enviar denúncia');
    },
  });
}

/**
 * Hook para resolver uma denúncia
 */
export function useResolveReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      note 
    }: { 
      reportId: string; 
      status: 'resolved' | 'dismissed'; 
      note?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar o status da denúncia
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status,
          resolved_by: user.id,
          resolution_note: note,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Registrar no log de moderação
      const { error: logError } = await supabase
        .from('moderation_logs')
        .insert({
          moderator_id: user.id,
          action: status === 'resolved' ? 'resolve_report' : 'dismiss_report',
          target_type: 'report',
          target_id: reportId,
          reason: note,
        });

      if (logError) throw logError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['moderator-stats'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-logs'] });
      toast.success(variables.status === 'resolved' ? 'Denúncia resolvida' : 'Denúncia dispensada');
    },
    onError: (error) => {
      console.error('Erro ao resolver denúncia:', error);
      toast.error('Erro ao processar denúncia');
    },
  });
}

/**
 * Hook para ocultar/exibir uma review
 */
export function useToggleReviewVisibility() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      reviewId, 
      hide, 
      reason 
    }: { 
      reviewId: string; 
      hide: boolean; 
      reason?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar a review
      const { error: updateError } = await supabase
        .from('reviews')
        .update({ is_hidden: hide })
        .eq('id', reviewId);

      if (updateError) throw updateError;

      // Registrar no log de moderação
      const { error: logError } = await supabase
        .from('moderation_logs')
        .insert({
          moderator_id: user.id,
          action: hide ? 'hide_review' : 'unhide_review',
          target_type: 'review',
          target_id: reviewId,
          reason,
        });

      if (logError) throw logError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-logs'] });
      toast.success(variables.hide ? 'Review ocultada' : 'Review restaurada');
    },
    onError: (error) => {
      console.error('Erro ao alterar visibilidade da review:', error);
      toast.error('Erro ao processar ação');
    },
  });
}

/**
 * Hook para avisar um usuário
 */
export function useWarnUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      reason 
    }: { 
      userId: string; 
      reason: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar o perfil do usuário
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('warn_count')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          warned_at: new Date().toISOString(),
          warn_count: (profile?.warn_count || 0) + 1,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Registrar no log de moderação
      const { error: logError } = await supabase
        .from('moderation_logs')
        .insert({
          moderator_id: user.id,
          action: 'warn_user',
          target_type: 'user',
          target_id: userId,
          reason,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-logs'] });
      toast.success('Aviso enviado ao usuário');
    },
    onError: (error) => {
      console.error('Erro ao avisar usuário:', error);
      toast.error('Erro ao enviar aviso');
    },
  });
}

/**
 * Hook para banir temporariamente um usuário
 */
export function useTempBanUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      days, 
      reason 
    }: { 
      userId: string; 
      days: number; 
      reason: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + days);

      // Atualizar o perfil do usuário
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ban_until: banUntil.toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Registrar no log de moderação
      const { error: logError } = await supabase
        .from('moderation_logs')
        .insert({
          moderator_id: user.id,
          action: 'temp_ban',
          target_type: 'user',
          target_id: userId,
          reason,
          metadata: { days },
        });

      if (logError) throw logError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-logs'] });
      toast.success(`Usuário banido por ${variables.days} dias`);
    },
    onError: (error) => {
      console.error('Erro ao banir usuário:', error);
      toast.error('Erro ao aplicar ban');
    },
  });
}

/**
 * Hook para remover ban de um usuário
 */
export function useUnbanUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      reason 
    }: { 
      userId: string; 
      reason?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Remover ban do perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ban_until: null })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Registrar no log de moderação
      const { error: logError } = await supabase
        .from('moderation_logs')
        .insert({
          moderator_id: user.id,
          action: 'unban',
          target_type: 'user',
          target_id: userId,
          reason,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-logs'] });
      toast.success('Ban removido');
    },
    onError: (error) => {
      console.error('Erro ao remover ban:', error);
      toast.error('Erro ao remover ban');
    },
  });
}

/**
 * Hook para contar denúncias pendentes (para badge no sidebar)
 */
export function usePendingReportsCount() {
  const { data: isModerator } = useIsModerator();

  return useQuery({
    queryKey: ['pending-reports-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        console.error('Erro ao contar denúncias:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!isModerator,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
}
