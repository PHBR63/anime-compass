import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Interface para convite
export interface UserInvite {
  id: string;
  inviter_id: string;
  invite_code: string;
  invited_email: string | null;
  invited_user_id: string | null;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  accepted_at: string | null;
}

// Interface para estatísticas de convite
export interface InviteStats {
  total: number;
  pending: number;
  accepted: number;
}

/**
 * Gera um código de convite único
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Hook para buscar convites do usuário
 */
export function useUserInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-invites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserInvite[];
    },
    enabled: !!user,
  });
}

/**
 * Hook para estatísticas de convites
 */
export function useInviteStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invite-stats', user?.id],
    queryFn: async (): Promise<InviteStats> => {
      if (!user) return { total: 0, pending: 0, accepted: 0 };

      const { data, error } = await supabase
        .from('user_invites')
        .select('status')
        .eq('inviter_id', user.id);

      if (error) throw error;

      const invites = data || [];
      return {
        total: invites.length,
        pending: invites.filter(i => i.status === 'pending').length,
        accepted: invites.filter(i => i.status === 'accepted').length,
      };
    },
    enabled: !!user,
  });
}

/**
 * Hook para criar novo convite
 */
export function useCreateInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email?: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      const invite_code = generateInviteCode();

      const { data, error } = await supabase
        .from('user_invites')
        .insert({
          inviter_id: user.id,
          invite_code,
          invited_email: email || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-invites'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
      toast.success('Convite criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar convite:', error);
      toast.error('Erro ao criar convite');
    },
  });
}

/**
 * Hook para aceitar convite (usado no registro)
 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteCode, userId }: { inviteCode: string; userId: string }) => {
      // Buscar convite pelo código
      const { data: invite, error: fetchError } = await supabase
        .from('user_invites')
        .select('*')
        .eq('invite_code', inviteCode)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invite) {
        throw new Error('Convite inválido ou expirado');
      }

      // Atualizar convite como aceito
      const { error: updateError } = await supabase
        .from('user_invites')
        .update({
          status: 'accepted',
          invited_user_id: userId,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      // Criar amizade automática entre quem convidou e quem aceitou
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          requester_id: invite.inviter_id,
          addressee_id: userId,
          status: 'accepted',
        });

      // Ignorar erro de amizade duplicada
      if (friendshipError && !friendshipError.message.includes('duplicate')) {
        console.error('Erro ao criar amizade:', friendshipError);
      }

      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-invites'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast.success('Convite aceito! Você agora é amigo de quem te convidou.');
    },
    onError: (error) => {
      console.error('Erro ao aceitar convite:', error);
      toast.error('Convite inválido ou já utilizado');
    },
  });
}

/**
 * Hook para verificar código de convite
 */
export function useCheckInviteCode(code: string | null) {
  return useQuery({
    queryKey: ['invite-code', code],
    queryFn: async () => {
      if (!code) return null;

      const { data, error } = await supabase
        .from('user_invites')
        .select('*, profiles:inviter_id(display_name, username, avatar_url)')
        .eq('invite_code', code)
        .eq('status', 'pending')
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!code,
  });
}

/**
 * Hook para gerar link de convite
 */
export function useInviteLink() {
  const { user } = useAuth();
  const createInvite = useCreateInvite();

  const generateLink = async () => {
    const invite = await createInvite.mutateAsync(undefined);
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?invite=${invite.invite_code}`;
  };

  return {
    generateLink,
    isLoading: createInvite.isPending,
  };
}
