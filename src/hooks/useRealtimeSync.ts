import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import {
  addCachedEntry,
  updateCachedEntry,
  removeCachedEntry,
} from '@/lib/offlineCache';

/**
 * Hook para escutar atualizações em tempo real da tabela anime_entries
 * Sincroniza automaticamente o cache local e invalida queries quando dados mudam
 */
export function useRealtimeSync() {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  /**
   * Processa eventos de INSERT
   */
  const handleInsert = useCallback(async (payload: { new: Record<string, unknown> }) => {
    const newEntry = payload.new;
    
    // Ignora se não é do usuário atual
    if (newEntry.user_id !== user?.id) return;

    console.log('[Realtime] Nova entrada detectada:', newEntry.title);

    // Adiciona ao cache local
    await addCachedEntry(newEntry);

    // Invalida queries para atualizar a UI
    queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  }, [user?.id, queryClient]);

  /**
   * Processa eventos de UPDATE
   */
  const handleUpdate = useCallback(async (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
    const updatedEntry = payload.new;
    
    // Ignora se não é do usuário atual
    if (updatedEntry.user_id !== user?.id) return;

    console.log('[Realtime] Entrada atualizada:', updatedEntry.title);

    // Atualiza cache local
    if (updatedEntry.is_archived) {
      // Se foi arquivado, remove do cache
      await removeCachedEntry(updatedEntry.id as string);
    } else {
      await updateCachedEntry(updatedEntry.id as string, updatedEntry);
    }

    // Invalida queries para atualizar a UI
    queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  }, [user?.id, queryClient]);

  /**
   * Processa eventos de DELETE
   */
  const handleDelete = useCallback(async (payload: { old: Record<string, unknown> }) => {
    const deletedEntry = payload.old;
    
    // Ignora se não é do usuário atual
    if (deletedEntry.user_id !== user?.id) return;

    console.log('[Realtime] Entrada removida:', deletedEntry.id);

    // Remove do cache local
    await removeCachedEntry(deletedEntry.id as string);

    // Invalida queries para atualizar a UI
    queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  }, [user?.id, queryClient]);

  useEffect(() => {
    // Só ativa realtime se estiver online e autenticado
    if (!isOnline || !user) return;

    console.log('[Realtime] Iniciando subscription para anime_entries');

    // Cria canal para escutar mudanças na tabela anime_entries
    const channel = supabase
      .channel('anime-entries-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anime_entries',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleInsert(payload as { new: Record<string, unknown> });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'anime_entries',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleUpdate(payload as { new: Record<string, unknown>; old: Record<string, unknown> });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'anime_entries',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleDelete(payload as { old: Record<string, unknown> });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Status da subscription:', status);
      });

    // Cleanup: remove o canal quando o componente desmontar
    return () => {
      console.log('[Realtime] Removendo subscription');
      supabase.removeChannel(channel);
    };
  }, [isOnline, user, handleInsert, handleUpdate, handleDelete]);
}
