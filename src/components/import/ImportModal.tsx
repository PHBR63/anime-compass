import { useState, useRef } from 'react';
import { Upload, FileJson, CheckCircle2, XCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useImportAnime, ImportResult, ImportProgress } from '@/hooks/useImportAnime';

// Componente para exibir o progresso da importação
function ImportProgressDisplay({ progress }: { progress: ImportProgress }) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  
  const phaseLabels: Record<ImportProgress['phase'], string> = {
    validating: 'Validando arquivo...',
    checking_duplicates: 'Verificando duplicatas...',
    searching: 'Buscando informações na API...',
    importing: 'Importando animes...',
    done: 'Concluído!',
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{phaseLabels[progress.phase]}</span>
          <span className="font-medium">{progress.current} / {progress.total}</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
      
      {progress.currentAnime && progress.phase !== 'done' && (
        <p className="text-sm text-muted-foreground truncate">
          Processando: <span className="text-foreground">{progress.currentAnime}</span>
        </p>
      )}
      
      {/* Estatísticas em tempo real */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{progress.imported} importados</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>{progress.duplicates} duplicatas</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="h-4 w-4 text-red-500" />
          <span>{progress.notFound} não encontrados</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-500" />
          <span>{progress.skipped} pulados</span>
        </div>
      </div>
    </div>
  );
}

// Componente para exibir o resultado final
function ImportResultDisplay({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {result.success ? (
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        ) : (
          <XCircle className="h-8 w-8 text-red-500" />
        )}
        <div>
          <h3 className="font-semibold">
            {result.success ? 'Importação concluída!' : 'Importação com erros'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {result.imported} anime(s) importado(s)
          </p>
        </div>
      </div>
      
      {/* Estatísticas finais */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-secondary/30 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{result.imported}</p>
          <p className="text-xs text-muted-foreground">Importados</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-500">{result.duplicates.length}</p>
          <p className="text-xs text-muted-foreground">Duplicatas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">{result.notFound.length}</p>
          <p className="text-xs text-muted-foreground">Não encontrados</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">{result.errors.length}</p>
          <p className="text-xs text-muted-foreground">Erros</p>
        </div>
      </div>
      
      {/* Lista de não encontrados */}
      {result.notFound.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Animes não encontrados na API ({result.notFound.length})
          </h4>
          <ScrollArea className="h-32 rounded-md border p-2">
            <div className="space-y-1">
              {result.notFound.map((title, i) => (
                <p key={i} className="text-xs text-muted-foreground">{title}</p>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* Lista de duplicatas */}
      {result.duplicates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Animes já existentes (pulados) ({result.duplicates.length})
          </h4>
          <ScrollArea className="h-32 rounded-md border p-2">
            <div className="space-y-1">
              {result.duplicates.map((title, i) => (
                <p key={i} className="text-xs text-muted-foreground">{title}</p>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      <Button onClick={onClose} className="w-full">
        Fechar
      </Button>
    </div>
  );
}

export function ImportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { importAnimes, isImporting, progress, resetProgress } = useImportAnime();
  
  // Handler para seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      setFileName(file.name);
      
      // Preview: contar animes
      try {
        const data = JSON.parse(content);
        setPreviewCount(data.animes?.length || 0);
      } catch {
        setPreviewCount(0);
      }
    };
    reader.readAsText(file);
  };
  
  // Handler para iniciar importação
  const handleImport = async () => {
    if (!fileContent) return;
    
    const importResult = await importAnimes(fileContent);
    setResult(importResult);
  };
  
  // Handler para fechar modal
  const handleClose = () => {
    if (isImporting) return;
    
    setIsOpen(false);
    setFileContent(null);
    setFileName(null);
    setPreviewCount(0);
    setResult(null);
    resetProgress();
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handler para abrir modal
  const handleOpenChange = (open: boolean) => {
    if (!open && isImporting) return;
    setIsOpen(open);
    if (!open) handleClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Lista de Animes</DialogTitle>
          <DialogDescription>
            Importe sua lista de animes a partir de um arquivo JSON exportado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Estado: Resultado final */}
          {result ? (
            <ImportResultDisplay result={result} onClose={handleClose} />
          ) : progress ? (
            /* Estado: Importando */
            <ImportProgressDisplay progress={progress} />
          ) : (
            /* Estado: Seleção de arquivo */
            <>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {fileName ? (
                  <div className="space-y-2">
                    <FileJson className="h-12 w-12 mx-auto text-primary" />
                    <p className="font-medium">{fileName}</p>
                    <Badge variant="secondary">
                      {previewCount} anime(s) encontrado(s)
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Clique para selecionar um arquivo JSON
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Formato: arquivo de exportação do AniCheck
                    </p>
                  </div>
                )}
              </div>
              
              {/* Aviso sobre tempo */}
              {previewCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">
                      Processo demorado
                    </p>
                    <p className="text-muted-foreground">
                      A importação de {previewCount} animes pode levar aproximadamente{' '}
                      <strong>{Math.ceil(previewCount * 0.4 / 60)} minutos</strong> devido ao
                      rate limiting da API Jikan.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!fileContent || isImporting}
                  className="flex-1"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Iniciar Importação
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
