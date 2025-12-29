/**
 * Componente principal para gerenciamento de testes do sistema
 * Exibe dashboard, lista de testes, histórico de execuções e detalhes
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  ChevronRight,
  Filter,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useSystemTests,
  useTestRuns,
  useTestRunResults,
  useTestRunSummary,
  useRunTests,
  useUpdateTest,
  useTestRunsRealtime,
  formatDuration,
  getStatusColor,
  getStatusIcon,
  getCriticalityColor,
  type TestRun,
  type TestResult
} from "@/hooks/useSystemTests";

/**
 * Dashboard com métricas resumidas
 */
function TestsDashboard() {
  const { data: summary, isLoading } = useTestRunSummary();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  
  const metrics = [
    {
      label: "Execuções",
      value: summary?.total_runs || 0,
      icon: Activity,
      color: "text-primary"
    },
    {
      label: "Taxa de Sucesso",
      value: `${summary?.success_rate || 0}%`,
      icon: CheckCircle,
      color: summary?.success_rate && summary.success_rate > 90 ? "text-green-500" : "text-yellow-500"
    },
    {
      label: "Tempo Médio",
      value: formatDuration(summary?.avg_duration_ms || 0),
      icon: Clock,
      color: "text-blue-500"
    },
    {
      label: "Falhas Recentes",
      value: summary?.critical_failures || 0,
      icon: AlertTriangle,
      color: summary?.critical_failures && summary.critical_failures > 0 ? "text-red-500" : "text-green-500"
    }
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${metric.color}`}>
                  <metric.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Lista de testes disponíveis
 */
function TestsList() {
  const { data: tests, isLoading } = useSystemTests();
  const updateTest = useUpdateTest();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const categories = tests 
    ? [...new Set(tests.map(t => t.category))]
    : [];
  
  const filteredTests = tests?.filter(t => 
    categoryFilter === "all" || t.category === categoryFilter
  );
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filtro por categoria */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredTests?.length || 0} testes
        </span>
      </div>
      
      {/* Lista de testes */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredTests?.map(test => (
            <div
              key={test.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{test.name}</span>
                  <Badge 
                    variant="outline" 
                    className={getCriticalityColor(test.criticality)}
                  >
                    {test.criticality}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {test.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {test.description || test.expected_behavior}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {test.module}
                </span>
                <Switch
                  checked={test.enabled}
                  onCheckedChange={(enabled) => 
                    updateTest.mutate({ testId: test.id, enabled })
                  }
                  disabled={updateTest.isPending}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Histórico de execuções
 */
function RunsHistory({ onSelectRun }: { onSelectRun: (run: TestRun) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTestRuns(page, 10);
  
  useTestRunsRealtime();
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {data?.runs.map(run => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onSelectRun(run)}
            >
              <div className="flex items-center gap-3">
                <div className={`text-xl ${getStatusColor(run.status)}`}>
                  {run.status === 'running' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    getStatusIcon(run.status)
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {new Date(run.started_at).toLocaleString('pt-BR')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {run.trigger_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="text-green-500">✓ {run.passed}</span>
                    <span className="text-red-500">✗ {run.failed}</span>
                    <span className="text-muted-foreground">○ {run.skipped}</span>
                    {run.duration_ms && (
                      <span className="ml-2">
                        ⏱ {formatDuration(run.duration_ms)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Paginação */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(data.total / data.pageSize)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Modal de detalhes de uma execução
 */
function RunDetailsModal({ 
  run, 
  onClose 
}: { 
  run: TestRun | null; 
  onClose: () => void;
}) {
  const { data: results, isLoading } = useTestRunResults(run?.id || null);
  
  if (!run) return null;
  
  return (
    <Dialog open={!!run} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={getStatusColor(run.status)}>
              {getStatusIcon(run.status)}
            </span>
            Execução de {new Date(run.started_at).toLocaleString('pt-BR')}
          </DialogTitle>
          <DialogDescription>
            {run.total_tests} testes • {run.passed} passaram • {run.failed} falharam
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 p-1">
                {results?.map(result => (
                  <TestResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Card de resultado de um teste individual
 */
function TestResultCard({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false);
  const test = result.system_tests;
  
  return (
    <div 
      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
        result.status === 'passed' ? 'border-green-500/30 bg-green-500/5' :
        result.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
        'border-border/50'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={getStatusColor(result.status)}>
            {getStatusIcon(result.status)}
          </span>
          <div>
            <span className="font-medium text-sm">{test?.name || 'Teste'}</span>
            {test && (
              <div className="flex gap-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  {test.category}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getCriticalityColor(test.criticality)}`}
                >
                  {test.criticality}
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            {formatDuration(result.duration_ms)}
          </span>
        </div>
      </div>
      
      {/* Erro (se houver) */}
      {result.error_message && (
        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-500 font-mono">{result.error_message}</p>
        </div>
      )}
      
      {/* Detalhes expandidos */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-border/50"
        >
          {/* Assertions */}
          {result.assertions && result.assertions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-1">Verificações:</p>
              <div className="space-y-1">
                {result.assertions.map((assertion, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className={assertion.passed ? 'text-green-500' : 'text-red-500'}>
                      {assertion.passed ? '✓' : '✗'}
                    </span>
                    <span>{assertion.name}</span>
                    {assertion.message && (
                      <span className="text-muted-foreground">- {assertion.message}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Logs */}
          {result.logs && result.logs.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Logs:</p>
              <ScrollArea className="h-32">
                <pre className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded">
                  {result.logs.join('\n')}
                </pre>
              </ScrollArea>
            </div>
          )}
          
          {/* Detalhes técnicos */}
          {result.details && Object.keys(result.details).length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Detalhes:</p>
              <pre className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Componente principal
 */
export function SystemTests() {
  const runTests = useRunTests();
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [categoryToRun, setCategoryToRun] = useState<string>("all");
  
  const { data: tests } = useSystemTests();
  const categories = tests 
    ? [...new Set(tests.map(t => t.category))]
    : [];
  
  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Testes do Sistema</h2>
          <p className="text-sm text-muted-foreground">
            Monitore a saúde do sistema com testes automatizados
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={categoryToRun} onValueChange={setCategoryToRun}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os testes</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => runTests.mutate({ 
              category: categoryToRun === 'all' ? undefined : categoryToRun 
            })}
            disabled={runTests.isPending}
          >
            {runTests.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Executar Testes
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Dashboard */}
      <TestsDashboard />
      
      {/* Tabs de conteúdo */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2">
            <Activity className="h-4 w-4" />
            Testes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Execuções</CardTitle>
              <CardDescription>
                Clique em uma execução para ver os detalhes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RunsHistory onSelectRun={setSelectedRun} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testes Disponíveis</CardTitle>
              <CardDescription>
                Gerencie os testes do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal de detalhes */}
      <RunDetailsModal 
        run={selectedRun} 
        onClose={() => setSelectedRun(null)} 
      />
    </div>
  );
}