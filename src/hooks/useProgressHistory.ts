import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Tipo para registro de histórico de progresso
export interface ProgressHistoryEntry {
  id: string;
  anime_entry_id: string;
  user_id: string;
  episodes_from: number;
  episodes_to: number;
  created_at: string;
}

// Hook para buscar histórico de progresso de um anime
export function useProgressHistory(animeEntryId: string | undefined) {
  return useQuery({
    queryKey: ['progressHistory', animeEntryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('episode_progress_history')
        .select('*')
        .eq('anime_entry_id', animeEntryId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ProgressHistoryEntry[];
    },
    enabled: !!animeEntryId,
  });
}

// Hook para adicionar registro ao histórico
export function useAddProgressHistory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      anime_entry_id: string;
      episodes_from: number;
      episodes_to: number;
    }) => {
      // Não registrar se for o mesmo valor
      if (data.episodes_from === data.episodes_to) return;

      const { error } = await supabase
        .from('episode_progress_history')
        .insert({
          anime_entry_id: data.anime_entry_id,
          user_id: user!.id,
          episodes_from: data.episodes_from,
          episodes_to: data.episodes_to,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progressHistory', variables.anime_entry_id] });
    },
  });
}

// Hook para limpar histórico de um anime
export function useClearProgressHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (animeEntryId: string) => {
      const { error } = await supabase
        .from('episode_progress_history')
        .delete()
        .eq('anime_entry_id', animeEntryId);

      if (error) throw error;
    },
    onSuccess: (_, animeEntryId) => {
      queryClient.invalidateQueries({ queryKey: ['progressHistory', animeEntryId] });
    },
  });
}

// Função para formatar data e hora do histórico
export function formatHistoryDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `Hoje às ${time}`;
  if (diffDays === 1) return `Ontem às ${time}`;
  if (diffDays < 7) return `${diffDays} dias atrás`;
  
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Função para descrever a mudança de progresso
export function getProgressDescription(from: number, to: number): string {
  const diff = to - from;
  
  if (diff > 0) {
    if (diff === 1) return `Assistiu episódio ${to}`;
    return `Assistiu ${diff} episódios (${from + 1}-${to})`;
  } else {
    if (diff === -1) return `Removeu episódio ${from}`;
    return `Voltou de ${from} para ${to} episódios`;
  }
}
