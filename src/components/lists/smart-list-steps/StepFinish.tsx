import { Globe, Lock, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SmartListStats } from '../SmartListStats';
import type { AnimeEntry } from '@/lib/franchiseDetector';

interface StepFinishProps {
  name: string;
  isPublic: boolean;
  onPublicChange: (value: boolean) => void;
  selectedEntries: AnimeEntry[];
  isCreating: boolean;
  onCancel: () => void;
  onCreate: () => void;
}

/**
 * Etapa 4: Finalização
 * Resumo das estatísticas e botão de criação
 */
export function StepFinish({
  name,
  isPublic,
  onPublicChange,
  selectedEntries,
  isCreating,
  onCancel,
  onCreate,
}: StepFinishProps) {
  const canCreate = name.trim() && selectedEntries.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="font-medium">Revise sua lista</h3>
        <p className="text-sm text-muted-foreground">
          Confira as estatísticas e crie sua lista
        </p>
      </div>

      {/* Nome da lista */}
      <motion.div 
        className="p-4 rounded-lg border bg-secondary/20 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Label className="text-xs text-muted-foreground">Nome da Lista</Label>
        <p className="text-lg font-medium mt-1">{name || '(Sem nome)'}</p>
      </motion.div>

      {/* Estatísticas */}
      <motion.div 
        className="p-4 rounded-lg border bg-secondary/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
      >
        <SmartListStats entries={selectedEntries} />
      </motion.div>

      {/* Toggle público/privado */}
      <motion.div 
        className="flex items-center justify-between p-4 rounded-lg border bg-secondary/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          {isPublic ? (
            <div className="p-2 rounded-full bg-green-500/10">
              <Globe className="h-5 w-5 text-green-500" />
            </div>
          ) : (
            <div className="p-2 rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <Label htmlFor="finish-public" className="cursor-pointer font-medium">
              {isPublic ? 'Lista Pública' : 'Lista Privada'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isPublic ? 'Qualquer pessoa pode ver' : 'Apenas você pode ver'}
            </p>
          </div>
        </div>
        <Switch
          id="finish-public"
          checked={isPublic}
          onCheckedChange={onPublicChange}
        />
      </motion.div>

      {/* Preview compacto das capas */}
      {selectedEntries.length > 0 && (
        <motion.div 
          className="flex items-center justify-center gap-1 py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {selectedEntries.slice(0, 8).map((entry, index) => (
            <motion.img
              key={entry.id}
              src={entry.image_url || '/placeholder.svg'}
              alt={entry.title}
              className="w-10 h-14 rounded object-cover shadow-sm"
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            />
          ))}
          {selectedEntries.length > 8 && (
            <motion.div 
              className="w-10 h-14 rounded bg-secondary/50 flex items-center justify-center text-xs font-medium text-muted-foreground"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.25 }}
            >
              +{selectedEntries.length - 8}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Botões de ação */}
      <motion.div 
        className="flex gap-3 pt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
      >
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={onCancel}
          disabled={isCreating}
        >
          Cancelar
        </Button>
        <Button 
          className="flex-1 gap-2"
          onClick={onCreate}
          disabled={!canCreate || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Criar com {selectedEntries.length} animes
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
