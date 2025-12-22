import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getPendingOperations, type PendingOperation } from '@/lib/offlineQueue';

/**
 * Hook para verificar operações pendentes de sincronização
 * Retorna funções para checar se um item específico está pendente
 */
export function usePendingSync() {
  const { user } = useAuth();
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);

  // Carrega operações pendentes
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

  /**
   * Verifica se um anime específico tem operação pendente
   * Busca por mal_id ou id nos dados da operação
   */
  const hasPendingForAnime = useCallback((animeId: string | number): boolean => {
    return pendingOperations.some(op => {
      const data = op.data;
      // Verifica por mal_id (número) ou id (string UUID)
      return (
        data.mal_id === animeId || 
        data.id === animeId ||
        // Para operações de anime, o id pode estar como string
        String(data.mal_id) === String(animeId) ||
        String(data.id) === String(animeId)
      );
    });
  }, [pendingOperations]);

  /**
   * Obtém o tipo de operação pendente para um anime
   */
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

  /**
   * Verifica se há qualquer operação pendente
   */
  const hasPendingOperations = pendingOperations.length > 0;

  return {
    pendingOperations,
    hasPendingForAnime,
    getPendingOperationType,
    hasPendingOperations,
    pendingCount: pendingOperations.length,
    refresh: loadPending,
  };
}
