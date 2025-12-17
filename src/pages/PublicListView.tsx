import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Globe, User, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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

const statusColors: Record<AnimeStatus, string> = {
  watching: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  dropped: 'bg-red-500/20 text-red-400 border-red-500/30',
  not_started: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

/**
 * Página pública para visualizar listas compartilhadas
 */
export default function PublicListView() {
  const { listId } = useParams<{ listId: string }>();

  // Buscar dados da lista pública com fallback robusto
  const { data: listData, isLoading, error } = useQuery({
    queryKey: ['public-list', listId],
    queryFn: async () => {
      if (!listId) throw new Error('ID da lista não fornecido');

      // Passo 1: Buscar a lista com embed de profile (FK agora aponta para profiles)
      const { data: list, error: listError } = await supabase
        .from('custom_lists')
        .select('*, profiles:user_id(username, display_name, avatar_url)')
        .eq('id', listId)
        .eq('is_public', true)
        .maybeSingle();

      if (listError) {
        console.error('Erro ao buscar lista:', listError);
        throw listError;
      }
      if (!list) throw new Error('Lista não encontrada ou não é pública');

      // Passo 2: Tentar buscar itens com JOIN
      const { data: itemsWithJoin, error: joinError } = await supabase
        .from('list_items')
        .select('*, anime_entry:anime_entries(*)')
        .eq('list_id', listId)
        .order('position', { ascending: true });

      // Se o JOIN funcionar, retorna direto
      if (!joinError && itemsWithJoin) {
        return { list, items: itemsWithJoin };
      }

      // Passo 3: Fallback - consultas separadas
      console.warn('JOIN falhou, usando fallback com consultas separadas:', joinError);
      
      // Buscar apenas IDs dos itens
      const { data: itemIds, error: itemsError } = await supabase
        .from('list_items')
        .select('id, anime_entry_id, position')
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (itemsError) {
        console.error('Erro ao buscar itens:', itemsError);
        throw itemsError;
      }

      if (!itemIds || itemIds.length === 0) {
        return { list, items: [] };
      }

      // Buscar anime_entries separadamente
      const entryIds = itemIds.map(i => i.anime_entry_id);
      const { data: entries, error: entriesError } = await supabase
        .from('anime_entries')
        .select('*')
        .in('id', entryIds);

      if (entriesError) {
        console.warn('Não foi possível carregar detalhes dos animes:', entriesError);
        // Retorna itens sem detalhes dos animes
        return {
          list,
          items: itemIds.map(item => ({ ...item, anime_entry: null }))
        };
      }

      // Combinar items com entries
      const items = itemIds.map(item => ({
        ...item,
        anime_entry: entries?.find(e => e.id === item.anime_entry_id) || null
      }));

      return { list, items };
    },
    enabled: !!listId,
    retry: 2,
    staleTime: 30000, // Cache por 30 segundos
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !listData) {
    // Extrai detalhes do erro para facilitar debug (sem expor informações sensíveis)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2">Lista não encontrada</h1>
          <p className="text-muted-foreground mb-4">
            Esta lista não existe, foi removida ou não é pública.
          </p>

          {/* Detalhes do erro (ajuda a diagnosticar RLS/permite identificar regressões) */}
          <div className="text-left bg-muted/30 border border-border/50 rounded-lg p-3 mb-6">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Detalhe:</span> {errorMessage}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 break-all">
              <span className="font-medium text-foreground">ID:</span> {listId || '—'}
            </p>
          </div>

          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { list, items } = listData as any;
  const profile = (list as any).profiles as any;
  const entries = items?.map((item: any) => item.anime_entry).filter(Boolean) || [];
  const bannerImages = entries.slice(0, 3).map((e: any) => e.image_url);

  return (
    <div className="min-h-screen bg-background">
      {/* Header com banner */}
      <div className="relative">
        {/* Banner */}
        <div className="h-48 md:h-64 overflow-hidden">
          {bannerImages.length > 0 ? (
            <div className="flex w-full h-full">
              {bannerImages.map((url: string, index: number) => (
                <div key={index} className="flex-1 relative overflow-hidden">
                  <img
                    src={url || '/placeholder.svg'}
                    alt=""
                    className="w-full h-full object-cover blur-sm scale-110"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        </div>

        {/* Conteúdo do header */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Navegação */}
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>

            {/* Info da lista */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl md:text-4xl font-bold">
                    {list.name}
                  </h1>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Globe className="h-3 w-3 mr-1" />
                    Pública
                  </Badge>
                </div>

                {list.description && (
                  <p className="text-muted-foreground mt-2 max-w-2xl">
                    {list.description}
                  </p>
                )}

                {/* Info do autor */}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.display_name || profile.username}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span>Por {profile?.display_name || profile?.username || 'Usuário'}</span>
                  </div>
                  <span>•</span>
                  <span>{entries.length} anime{entries.length !== 1 && 's'}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(list.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de animes */}
      <div className="max-w-6xl mx-auto p-4 md:p-8 pt-8">
        {entries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {entries.map((anime: any, index: number) => (
              <div 
                key={anime.id}
                className="group relative rounded-xl overflow-hidden bg-card border border-border/50 transition-all hover:border-border hover:shadow-lg"
              >
                {/* Número da posição */}
                <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>

                {/* Imagem */}
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={anime.image_url || '/placeholder.svg'}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  
                  {/* Gradiente */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  
                  {/* Badge de status */}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "absolute top-2 right-2 text-xs border",
                      statusColors[anime.status as AnimeStatus]
                    )}
                  >
                    {statusLabels[anime.status as AnimeStatus]}
                  </Badge>

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                    <h3 className="font-semibold text-sm line-clamp-2 text-foreground drop-shadow-lg">
                      {anime.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {anime.rating && <span>★ {anime.rating}</span>}
                      <span>{anime.episodes_watched || 0}/{anime.total_episodes || '?'} eps</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground">Esta lista está vazia</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 mt-8">
        <div className="max-w-6xl mx-auto p-4 md:p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Crie sua própria lista de animes no{' '}
            <Link to="/" className="text-primary hover:underline font-medium">
              AniTracker
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
