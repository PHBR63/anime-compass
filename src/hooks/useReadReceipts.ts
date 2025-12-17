import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Interface para status de leitura de participantes
interface ParticipantReadStatus {
  user_id: string;
  last_read_at: string | null;
  display_name: string | null;
  username: string | null;
}

/**
 * Hook para buscar status de leitura dos participantes de uma conversa
 * Usado para mostrar confirmação de leitura nas mensagens
 */
export function useReadReceipts(conversationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['readReceipts', conversationId],
    queryFn: async () => {
      if (!conversationId || !user) return [];

      // Buscar todos os participantes com seus last_read_at
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

      if (error) throw error;
      if (!participants?.length) return [];

      // Buscar perfis
      const userIds = participants.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return participants.map(p => ({
        user_id: p.user_id,
        last_read_at: p.last_read_at,
        display_name: profileMap.get(p.user_id)?.display_name || null,
        username: profileMap.get(p.user_id)?.username || null,
      })) as ParticipantReadStatus[];
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });
}

/**
 * Verifica se uma mensagem foi lida por pelo menos um participante
 * @param messageCreatedAt - Data de criação da mensagem
 * @param readReceipts - Lista de status de leitura dos participantes
 * @returns true se a mensagem foi lida por pelo menos uma pessoa
 */
export function isMessageRead(
  messageCreatedAt: string, 
  readReceipts: ParticipantReadStatus[]
): boolean {
  if (!readReceipts.length) return false;
  
  const messageDate = new Date(messageCreatedAt).getTime();
  
  return readReceipts.some(receipt => {
    if (!receipt.last_read_at) return false;
    const readDate = new Date(receipt.last_read_at).getTime();
    return readDate >= messageDate;
  });
}

/**
 * Retorna os nomes dos usuários que leram a mensagem
 */
export function getReadByNames(
  messageCreatedAt: string,
  readReceipts: ParticipantReadStatus[]
): string[] {
  if (!readReceipts.length) return [];
  
  const messageDate = new Date(messageCreatedAt).getTime();
  
  return readReceipts
    .filter(receipt => {
      if (!receipt.last_read_at) return false;
      const readDate = new Date(receipt.last_read_at).getTime();
      return readDate >= messageDate;
    })
    .map(receipt => receipt.display_name || receipt.username || 'Usuário');
}
