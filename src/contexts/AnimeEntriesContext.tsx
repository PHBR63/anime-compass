/**
 * Contexto para compartilhar dados de anime entries entre componentes
 * Evita chamadas redundantes ao hook useAnimeEntries em múltiplos cards
 * Inclui suporte offline-first para operações
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { addToQueue } from '@/lib/offlineQueue';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeEntryInsert = Database['public']['Tables']['anime_entries']['Insert'];
type AnimeEntryUpdate = Database['public']['Tables']['anime_entries']['Update'];

// Tipo do contexto
interface AnimeEntriesContextType {
  entries: AnimeEntry[] | undefined;
  isLoading: boolean;
  isInList: (malId: number) => boolean;
  getEntry: (malId: number) => AnimeEntry | undefined;
  addEntry: ReturnType<typeof useAddMutation>;
  updateEntry: ReturnType<typeof useUpdateMutation>;
  deleteEntry: ReturnType<typeof useDeleteMutation>;
}

const AnimeEntriesContext = createContext<AnimeEntriesContextType | undefined>(undefined);

/**
 * Hook de adicionar anime com suporte offline
 */
function useAddMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async (entry: Omit<AnimeEntryInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Se offline, adiciona à fila
      if (!isOnline) {
        await addToQueue('add-anime', { ...entry, user_id: user.id }, user.id);
        return {
          ...entry,
          id: `temp-${Date.now()}`,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AnimeEntry;
      }
      
      const { data, error } = await supabase
        .from('anime_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      if (!isOnline) {
        toast.success('Anime salvo offline!');
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('Este anime já está na sua lista');
      } else {
        toast.error('Erro ao adicionar anime');
      }
    },
  });
}

/**
 * Hook de atualizar anime com suporte offline
 */
function useUpdateMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AnimeEntryUpdate & { id: string }) => {
      // Se offline, adiciona à fila
      if (!isOnline && user) {
        await addToQueue('update-anime', { id, ...updates }, user.id);
        return { id, ...updates } as AnimeEntry;
      }
      
      const { data, error } = await supabase
        .from('anime_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      if (!isOnline) {
        toast.info('Alteração salva offline');
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar anime');
    },
  });
}

/**
 * Hook de deletar anime com suporte offline
 */
function useDeleteMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async (id: string) => {
      // Se offline, adiciona à fila
      if (!isOnline && user) {
        await addToQueue('delete-anime', { id }, user.id);
        return;
      }
      
      const { error } = await supabase
        .from('anime_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      if (isOnline) {
        toast.success('Anime removido da lista');
      } else {
        toast.success('Remoção salva offline');
      }
    },
    onError: () => {
      toast.error('Erro ao remover anime');
    },
  });
}

// Provider do contexto
export function AnimeEntriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Busca todas as entries uma única vez
  const { data: entries, isLoading } = useQuery({
    queryKey: ['anime-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('anime_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as AnimeEntry[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const addEntry = useAddMutation();
  const updateEntry = useUpdateMutation();
  const deleteEntry = useDeleteMutation();

  // Função memoizada para verificar se anime está na lista
  const isInList = React.useCallback((malId: number): boolean => {
    return entries?.some(entry => entry.mal_id === malId) ?? false;
  }, [entries]);

  // Função memoizada para buscar entry específica
  const getEntry = React.useCallback((malId: number): AnimeEntry | undefined => {
    return entries?.find(entry => entry.mal_id === malId);
  }, [entries]);

  const value = React.useMemo(() => ({
    entries,
    isLoading,
    isInList,
    getEntry,
    addEntry,
    updateEntry,
    deleteEntry,
  }), [entries, isLoading, isInList, getEntry, addEntry, updateEntry, deleteEntry]);

  return (
    <AnimeEntriesContext.Provider value={value}>
      {children}
    </AnimeEntriesContext.Provider>
  );
}

// Hook para usar o contexto
export function useAnimeEntriesContext() {
  const context = useContext(AnimeEntriesContext);
  if (context === undefined) {
    throw new Error('useAnimeEntriesContext must be used within an AnimeEntriesProvider');
  }
  return context;
}
