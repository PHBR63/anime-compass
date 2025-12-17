import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ListDetailView } from '@/components/lists/ListDetailView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ArrowLeft, AlertCircle, Home, List } from 'lucide-react';
import type { CustomList } from '@/hooks/useCustomLists';

/**
 * Página de visualização de lista por ID (rota protegida)
 * Permite acessar uma lista diretamente via URL /list/:id
 */
export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Busca a lista pelo ID
  const { data: list, isLoading, error } = useQuery({
    queryKey: ['custom-list', id],
    queryFn: async () => {
      if (!id) throw new Error('ID da lista não informado');
      
      const { data, error } = await supabase
        .from('custom_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CustomList;
    },
    enabled: !!id,
  });

  // Handler para voltar
  const handleBack = () => {
    navigate('/list');
  };

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Estado de erro ou lista não encontrada
  if (error || !list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lista não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A lista que você procura não existe ou você não tem permissão para visualizá-la.
          </p>
        </div>
        <Button onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Minhas Listas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb para navegação */}
      <Breadcrumb className="px-4 pt-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/list" className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Início</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/list" className="flex items-center gap-1">
                <List className="h-3.5 w-3.5" />
                Minhas Listas
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[150px] sm:max-w-[250px] truncate">
              {list.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ListDetailView list={list} onBack={handleBack} />
    </div>
  );
}
