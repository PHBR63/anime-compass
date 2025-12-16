import { useState, useMemo } from 'react';
import { Sparkles, Lock, Globe, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useCreateList, useAddToList } from '@/hooks/useCustomLists';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

// Labels para os status
const statusLabels: Record<AnimeStatus, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Dropado',
  not_started: 'Planejado',
};

interface SmartListBuilderProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Construtor de listas inteligentes baseado em critérios
 */
export function SmartListBuilder({ onSuccess, onCancel }: SmartListBuilderProps) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // Filtros
  const [selectedStatuses, setSelectedStatuses] = useState<AnimeStatus[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const { data: entries } = useAnimeEntries();
  const createList = useCreateList();
  const addToList = useAddToList();

  // Filtrar animes baseado nos critérios
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter((entry) => {
      // Filtro por status
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(entry.status)) {
        return false;
      }

      // Filtro por nota mínima
      if (minRating > 0 && (!entry.rating || entry.rating < minRating)) {
        return false;
      }

      // Filtro por favoritos
      if (onlyFavorites && !entry.is_favorite) {
        return false;
      }

      // Não incluir arquivados
      if (entry.is_archived) {
        return false;
      }

      return true;
    });
  }, [entries, selectedStatuses, minRating, onlyFavorites]);

  // Handler para toggle de status
  const handleStatusToggle = (status: AnimeStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Handler para criar lista inteligente
  const handleCreate = async () => {
    if (!name.trim() || filteredEntries.length === 0) return;

    try {
      // Criar a lista
      const newList = await createList.mutateAsync({
        name: name.trim(),
        description: `Lista inteligente com ${filteredEntries.length} animes`,
        is_public: isPublic,
      });

      // Adicionar os animes filtrados à lista
      for (const entry of filteredEntries) {
        await addToList.mutateAsync({
          listId: newList.id,
          animeEntryId: entry.id,
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao criar lista inteligente:', error);
    }
  };

  const hasFilters = selectedStatuses.length > 0 || minRating > 0 || onlyFavorites;

  return (
    <div className="space-y-4">
      {/* Nome da lista */}
      <div className="space-y-2">
        <Label htmlFor="smart-name">Nome da Lista *</Label>
        <Input
          id="smart-name"
          placeholder="Ex: Favoritos 5 Estrelas"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Filtros */}
      <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Critérios de Seleção
        </div>

        {/* Filtro por Status */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="flex flex-wrap gap-2">
            {(['watching', 'completed', 'paused', 'dropped', 'not_started'] as AnimeStatus[]).map((status) => (
              <Badge
                key={status}
                variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => handleStatusToggle(status)}
              >
                {statusLabels[status]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Filtro por Nota */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Nota mínima: {minRating > 0 ? `${minRating} estrelas` : 'Qualquer'}
          </Label>
          <Slider
            value={[minRating]}
            onValueChange={([value]) => setMinRating(value)}
            max={5}
            step={1}
            className="w-full"
          />
        </div>

        {/* Apenas Favoritos */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="only-favorites"
            checked={onlyFavorites}
            onCheckedChange={(checked) => setOnlyFavorites(checked === true)}
          />
          <Label htmlFor="only-favorites" className="text-sm cursor-pointer">
            Apenas favoritos
          </Label>
        </div>
      </div>

      {/* Preview dos resultados */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Preview ({filteredEntries.length} anime{filteredEntries.length !== 1 && 's'})
          </Label>
          {!hasFilters && (
            <span className="text-xs text-amber-500">Selecione ao menos um filtro</span>
          )}
        </div>
        
        {filteredEntries.length > 0 ? (
          <ScrollArea className="h-32 rounded-md border bg-secondary/20">
            <div className="p-2 space-y-1">
              {filteredEntries.slice(0, 10).map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center gap-2 text-sm p-1 rounded hover:bg-secondary/50"
                >
                  <img 
                    src={entry.image_url || '/placeholder.svg'} 
                    alt={entry.title}
                    className="w-6 h-8 rounded object-cover"
                  />
                  <span className="truncate flex-1">{entry.title}</span>
                  {entry.rating && (
                    <span className="text-xs text-muted-foreground">★ {entry.rating}</span>
                  )}
                </div>
              ))}
              {filteredEntries.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{filteredEntries.length - 10} mais...
                </p>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-32 rounded-md border bg-secondary/20 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {hasFilters ? 'Nenhum anime encontrado' : 'Selecione filtros para ver o preview'}
            </p>
          </div>
        )}
      </div>

      {/* Toggle público/privado */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {isPublic ? (
            <Globe className="h-4 w-4 text-green-500" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="smart-public" className="cursor-pointer text-sm">
            {isPublic ? 'Lista Pública' : 'Lista Privada'}
          </Label>
        </div>
        <Switch
          id="smart-public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={handleCreate} 
          disabled={!name.trim() || filteredEntries.length === 0 || createList.isPending}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {createList.isPending ? 'Criando...' : `Criar com ${filteredEntries.length} animes`}
        </Button>
      </div>
    </div>
  );
}
