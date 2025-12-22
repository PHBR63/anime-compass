import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';
import {
  getPendingOperations,
  getPendingCount,
  removeFromQueue,
  incrementRetryCount,
  clearFailedOperations,
  type PendingOperation,
  type OperationType,
} from '@/lib/offlineQueue';
import { incrementalSync, hasServerUpdates } from '@/lib/incrementalSync';
import { getLastSyncTime } from '@/lib/offlineCache';

/**
 * Hook para gerenciar sincronização de operações offline
 * Sincroniza automaticamente quando volta online
 */
export function useOfflineSync() {
  const { user } = useAuth();
  const { isOnline, justCameOnline } = useOnlineStatus();
  const queryClient = useQueryClient();
  
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Atualiza contagem de operações pendentes
  const updatePendingCount = useCallback(async () => {
    if (!user) {
      setPendingCount(0);
      return;
    }
    
    const count = await getPendingCount(user.id);
    setPendingCount(count);
  }, [user]);

  // Processa uma operação individual
  const processOperation = async (operation: PendingOperation): Promise<boolean> => {
    try {
      switch (operation.type) {
        case 'add-anime':
          await supabase
            .from('anime_entries')
            .insert(operation.data as never);
          break;
          
        case 'update-anime':
        case 'update-progress':
        case 'toggle-favorite':
          const { id: updateId, ...updateData } = operation.data;
          await supabase
            .from('anime_entries')
            .update(updateData as never)
            .eq('id', updateId as string);
          break;
          
        case 'delete-anime':
          await supabase
            .from('anime_entries')
            .delete()
            .eq('id', operation.data.id as string);
          break;
          
        case 'add-review':
          await supabase
            .from('reviews')
            .insert(operation.data as never);
          break;
          
        case 'update-review':
          const { id: reviewId, ...reviewData } = operation.data;
          await supabase
            .from('reviews')
            .update(reviewData as never)
            .eq('id', reviewId as string);
          break;
          
        default:
          console.warn(`Tipo de operação desconhecido: ${operation.type}`);
          return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao processar operação offline:', error);
      return false;
    }
  };

  // Sincroniza todas as operações pendentes
  const syncAll = useCallback(async () => {
    if (!user || !isOnline || isSyncing) return;
    
    const operations = await getPendingOperations(user.id);
    if (operations.length === 0) return;
    
    setIsSyncing(true);
    
    let successCount = 0;
    let failCount = 0;
    
    // Processa operações em ordem cronológica
    const sortedOps = operations.sort((a, b) => a.timestamp - b.timestamp);
    
    for (const operation of sortedOps) {
      const success = await processOperation(operation);
      
      if (success) {
        await removeFromQueue(operation.id);
        successCount++;
      } else {
        await incrementRetryCount(operation.id);
        failCount++;
      }
    }
    
    // Limpa operações que falharam muitas vezes
    const clearedCount = await clearFailedOperations(user.id);
    
    // Após sincronizar operações pendentes, faz sincronização incremental
    // para obter atualizações do servidor
    const incrementalResult = await incrementalSync(user.id);
    
    // Atualiza contagem e invalida queries
    await updatePendingCount();
    
    // Invalida todas as queries relevantes
    queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
    
    setLastSyncTime(new Date());
    setIsSyncing(false);
    
    // Calcula total de atualizações
    const totalUpdates = incrementalResult.added + incrementalResult.updated;
    
    // Notifica o usuário
    if (successCount > 0 || totalUpdates > 0) {
      const messages: string[] = [];
      if (successCount > 0) messages.push(`${successCount} operação(ões) enviada(s)`);
      if (totalUpdates > 0) messages.push(`${totalUpdates} atualização(ões) recebida(s)`);
      toast.success(messages.join(', '));
    }
    if (failCount > 0 && clearedCount === 0) {
      toast.warning(`${failCount} operação(ões) ainda pendente(s). Tentaremos novamente.`);
    }
    if (clearedCount > 0) {
      toast.error(`${clearedCount} operação(ões) removida(s) após falhas repetidas.`);
    }
  }, [user, isOnline, isSyncing, queryClient, updatePendingCount]);

  // Escuta eventos de atualização da fila
  useEffect(() => {
    const handleQueueUpdate = () => {
      updatePendingCount();
    };
    
    window.addEventListener('offline-queue-updated', handleQueueUpdate);
    return () => {
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
    };
  }, [updatePendingCount]);

  // Atualiza contagem quando usuário muda
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Sincroniza automaticamente quando volta online
  useEffect(() => {
    if (justCameOnline && user) {
      // Pequeno delay para garantir que a conexão está estável
      const timer = setTimeout(async () => {
        // Se tem operações pendentes, sincroniza tudo
        if (pendingCount > 0) {
          syncAll();
        } else {
          // Se não tem operações pendentes, apenas faz sync incremental
          const hasUpdates = await hasServerUpdates(user.id);
          if (hasUpdates) {
            setIsSyncing(true);
            const result = await incrementalSync(user.id);
            queryClient.invalidateQueries({ queryKey: ['anime-entries'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            setLastSyncTime(new Date());
            setIsSyncing(false);
            
            const totalUpdates = result.added + result.updated;
            if (totalUpdates > 0) {
              toast.success(`${totalUpdates} atualização(ões) sincronizada(s)`);
            }
          }
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [justCameOnline, pendingCount, syncAll, user, queryClient]);

  return {
    pendingCount,
    isSyncing,
    lastSyncTime,
    syncAll,
    isOnline,
  };
}

/**
 * Hook auxiliar para criar operações offline-first
 * Tenta online primeiro, se falhar adiciona à fila
 */
export function useOfflineOperation() {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  const executeWithOfflineFallback = useCallback(async (
    type: OperationType,
    onlineOperation: () => Promise<unknown>,
    offlineData: Record<string, unknown>
  ): Promise<{ success: boolean; offline: boolean }> => {
    if (!user) {
      return { success: false, offline: false };
    }

    // Se está online, tenta executar diretamente
    if (isOnline) {
      try {
        await onlineOperation();
        return { success: true, offline: false };
      } catch (error) {
        console.error('Operação online falhou, salvando offline:', error);
        // Se falhar, adiciona à fila offline
        const { addToQueue } = await import('@/lib/offlineQueue');
        await addToQueue(type, offlineData, user.id);
        toast.info('Operação salva para sincronização posterior');
        return { success: true, offline: true };
      }
    }

    // Se está offline, adiciona à fila
    const { addToQueue } = await import('@/lib/offlineQueue');
    await addToQueue(type, offlineData, user.id);
    toast.info('Você está offline. A operação será sincronizada quando voltar online.');
    return { success: true, offline: true };
  }, [user, isOnline]);

  return { executeWithOfflineFallback };
}
