/**
 * Hook para gerenciar testes do sistema
 * Permite visualizar, executar e monitorar testes automatizados
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// Tipos
export interface SystemTest {
  id: string;
  name: string;
  description: string | null;
  category: string;
  module: string;
  test_function: string;
  enabled: boolean;
  criticality: string;
  timeout_ms: number;
  expected_behavior: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: string;
  trigger_type: string;
  triggered_by: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  environment: string;
  // Relacionamento com profile
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TestResult {
  id: string;
  run_id: string;
  test_id: string;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  error_stack: string | null;
  details: Record<string, unknown>;
  assertions: Array<{ name: string; passed: boolean; message?: string }>;
  logs: string[] | null;
  created_at: string;
  // Relacionamento com teste
  system_tests?: SystemTest;
}

export interface TestRunSummary {
  total_runs: number;
  last_run_at: string | null;
  last_status: string | null;
  avg_duration_ms: number;
  success_rate: number;
  critical_failures: number;
}

/**
 * Hook para buscar todos os testes do sistema
 */
export function useSystemTests() {
  return useQuery({
    queryKey: ['system-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_tests')
        .select('*')
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data as SystemTest[];
    }
  });
}

/**
 * Hook para buscar execuções de testes com paginação
 */
export function useTestRuns(page: number = 1, pageSize: number = 10) {
  return useQuery({
    queryKey: ['test-runs', page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('test_runs')
        .select(`
          *,
          profiles:triggered_by (
            username,
            display_name,
            avatar_url
          )
        `, { count: 'exact' })
        .order('started_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      return {
        runs: data as TestRun[],
        total: count || 0,
        page,
        pageSize
      };
    }
  });
}

/**
 * Hook para buscar resultados de uma execução específica
 */
export function useTestRunResults(runId: string | null) {
  return useQuery({
    queryKey: ['test-run-results', runId],
    queryFn: async () => {
      if (!runId) return [];
      
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          *,
          system_tests (*)
        `)
        .eq('run_id', runId)
        .order('created_at');
      
      if (error) throw error;
      return data as TestResult[];
    },
    enabled: !!runId
  });
}

/**
 * Hook para buscar resumo dos testes
 */
export function useTestRunSummary() {
  return useQuery({
    queryKey: ['test-run-summary'],
    queryFn: async () => {
      // Busca últimas 100 execuções para calcular métricas
      const { data: runs, error } = await supabase
        .from('test_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const completedRuns = runs?.filter(r => r.status === 'completed') || [];
      const lastRun = runs?.[0];
      
      // Calcula métricas
      const totalRuns = runs?.length || 0;
      const avgDuration = completedRuns.length > 0
        ? completedRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / completedRuns.length
        : 0;
      
      const successfulRuns = completedRuns.filter(r => r.failed === 0);
      const successRate = completedRuns.length > 0
        ? (successfulRuns.length / completedRuns.length) * 100
        : 0;
      
      // Conta falhas críticas recentes
      const recentRuns = runs?.slice(0, 10) || [];
      const criticalFailures = recentRuns.reduce((sum, r) => sum + (r.failed || 0), 0);
      
      return {
        total_runs: totalRuns,
        last_run_at: lastRun?.started_at || null,
        last_status: lastRun?.status || null,
        avg_duration_ms: Math.round(avgDuration),
        success_rate: Math.round(successRate * 10) / 10,
        critical_failures: criticalFailures
      } as TestRunSummary;
    }
  });
}

/**
 * Hook para executar testes manualmente
 */
export function useRunTests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (options?: { 
      category?: string; 
      testIds?: string[];
      triggeredBy?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('run-system-tests', {
        body: {
          trigger: 'manual',
          triggered_by: options?.triggeredBy || user?.id,
          category: options?.category,
          test_ids: options?.testIds
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['test-run-summary'] });
      
      const summary = data.summary;
      if (summary.failed === 0) {
        toast({
          title: "Testes concluídos",
          description: `${summary.passed} de ${summary.total} testes passaram.`
        });
      } else {
        toast({
          title: "Testes concluídos com falhas",
          description: `${summary.failed} de ${summary.total} testes falharam.`,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao executar testes",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

/**
 * Hook para atualizar status de um teste
 */
export function useUpdateTest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ testId, enabled }: { testId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('system_tests')
        .update({ enabled })
        .eq('id', testId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-tests'] });
      toast({
        title: "Teste atualizado",
        description: "Status do teste atualizado com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar teste",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

/**
 * Hook para escutar atualizações em tempo real dos testes
 */
export function useTestRunsRealtime() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('test-runs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs'
        },
        () => {
          // Invalida queries quando há mudanças
          queryClient.invalidateQueries({ queryKey: ['test-runs'] });
          queryClient.invalidateQueries({ queryKey: ['test-run-summary'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Helper para formatar duração em texto legível
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Helper para obter cor do status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'passed':
    case 'completed':
      return 'text-green-500';
    case 'failed':
    case 'error':
      return 'text-red-500';
    case 'running':
      return 'text-yellow-500';
    case 'skipped':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Helper para obter ícone do status
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'passed':
    case 'completed':
      return '✅';
    case 'failed':
    case 'error':
      return '❌';
    case 'running':
      return '🔄';
    case 'skipped':
      return '⏭️';
    default:
      return '❓';
  }
}

/**
 * Helper para obter cor da criticidade
 */
export function getCriticalityColor(criticality: string): string {
  switch (criticality) {
    case 'critical':
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    case 'high':
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'low':
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}