/**
 * Contexto otimizado para compartilhar dados de anime entries entre componentes
 * Usa Map para buscas O(1) ao invés de O(n)
 * Inclui estado de sync pendente centralizado para evitar re-renders em massa
 */

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { addToQueue, getPendingOperations, type PendingOperation } from '@/lib/offlineQueue';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AnimeEntry = Database['public']['Tables']['anime_entries']['Row'];
type AnimeEntryInsert = Database['public']['Tables']['anime_entries']['Insert'];
type AnimeEntryUpdate = Database['public']['Tables']['anime_entries']['Update'];

// Interface do contexto com Map otimizado
interface AnimeEntriesContextType {
  entries: AnimeEntry[] | undefined;
  entriesMap: Map<number, AnimeEntry>; // Map para busca O(1) por mal_id
  entriesById: Map<string, AnimeEntry>; // Map para busca O(1) por id
  isLoading: boolean;
  isInList: (malId: number) => boolean;
  getEntry: (malId: number) => AnimeEntry | undefined;
  getEntryById: (id: string) => AnimeEntry | undefined;
  addEntry: ReturnType<typeof useAddMutation>;
  updateEntry: ReturnType<typeof useUpdateMutation>;
  deleteEntry: ReturnType<typeof useDeleteMutation>;
  // Estado de sync pendente centralizado
  pendingOperations: PendingOperation[];
  hasPendingForAnime: (animeId: string | number) => boolean;
  getPendingOperationType: (animeId: string | number) => string | null;
  hasPendingOperations: boolean;
  pendingCount: number;
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

// Provider do contexto com otimizações
export function AnimeEntriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  
  // Ativa sincronização em tempo real
  useRealtimeSync();
  
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

  // Carrega operações pendentes (centralizado para evitar re-renders em cada card)
  const loadPending = useCallback(async () => {
    if (!user) {
      setPendingOperations([]);
      return;
    }
    
    try {
      const operations = await getPendingOperations(user.id);
      setPendingOperations(operations);
    } catch (error) {
      console.error('Erro ao carregar operações pendentes:', error);
    }
  }, [user]);

  // Atualiza quando a fila muda
  useEffect(() => {
    loadPending();
    
    const handleQueueUpdate = () => {
      loadPending();
    };
    
    window.addEventListener('offline-queue-updated', handleQueueUpdate);
    return () => {
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
    };
  }, [loadPending]);

  // Cria Maps para busca O(1) - memoizado
  const entriesMap = React.useMemo(() => {
    const map = new Map<number, AnimeEntry>();
    entries?.forEach(entry => {
      map.set(entry.mal_id, entry);
    });
    return map;
  }, [entries]);

  const entriesById = React.useMemo(() => {
    const map = new Map<string, AnimeEntry>();
    entries?.forEach(entry => {
      map.set(entry.id, entry);
    });
    return map;
  }, [entries]);

  const addEntry = useAddMutation();
  const updateEntry = useUpdateMutation();
  const deleteEntry = useDeleteMutation();

  // Função O(1) para verificar se anime está na lista
  const isInList = React.useCallback((malId: number): boolean => {
    return entriesMap.has(malId);
  }, [entriesMap]);

  // Função O(1) para buscar entry por mal_id
  const getEntry = React.useCallback((malId: number): AnimeEntry | undefined => {
    return entriesMap.get(malId);
  }, [entriesMap]);

  // Função O(1) para buscar entry por id
  const getEntryById = React.useCallback((id: string): AnimeEntry | undefined => {
    return entriesById.get(id);
  }, [entriesById]);

  // Verifica se um anime específico tem operação pendente
  const hasPendingForAnime = useCallback((animeId: string | number): boolean => {
    return pendingOperations.some(op => {
      const data = op.data;
      return (
        data.mal_id === animeId || 
        data.id === animeId ||
        String(data.mal_id) === String(animeId) ||
        String(data.id) === String(animeId)
      );
    });
  }, [pendingOperations]);

  // Obtém o tipo de operação pendente para um anime
  const getPendingOperationType = useCallback((animeId: string | number): string | null => {
    const operation = pendingOperations.find(op => {
      const data = op.data;
      return (
        data.mal_id === animeId || 
        data.id === animeId ||
        String(data.mal_id) === String(animeId) ||
        String(data.id) === String(animeId)
      );
    });
    
    return operation?.type || null;
  }, [pendingOperations]);

  const value = React.useMemo(() => ({
    entries,
    entriesMap,
    entriesById,
    isLoading,
    isInList,
    getEntry,
    getEntryById,
    addEntry,
    updateEntry,
    deleteEntry,
    // Estado de sync centralizado
    pendingOperations,
    hasPendingForAnime,
    getPendingOperationType,
    hasPendingOperations: pendingOperations.length > 0,
    pendingCount: pendingOperations.length,
  }), [
    entries, 
    entriesMap, 
    entriesById, 
    isLoading, 
    isInList, 
    getEntry, 
    getEntryById, 
    addEntry, 
    updateEntry, 
    deleteEntry,
    pendingOperations,
    hasPendingForAnime,
    getPendingOperationType,
  ]);

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
