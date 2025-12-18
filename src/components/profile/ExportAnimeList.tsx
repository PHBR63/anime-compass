import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { Tables } from '@/integrations/supabase/types';

type AnimeEntry = Tables<'anime_entries'>;

interface ExportAnimeListProps {
  entries: AnimeEntry[];
  username?: string | null;
}

// Mapeamento de status para português
const statusLabels: Record<string, string> = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
  dropped: 'Abandonado',
  not_started: 'Planejo Assistir',
};

/**
 * Componente para exportar lista de animes em diferentes formatos
 * Suporta Excel (XLSX), JSON e CSV
 */
export function ExportAnimeList({ entries, username }: ExportAnimeListProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Formata os dados para exportação
  const formatDataForExport = () => {
    return entries.map((entry, index) => ({
      '#': index + 1,
      'Título': entry.title,
      'Status': statusLabels[entry.status] || entry.status,
      'Episódios Assistidos': entry.episodes_watched || 0,
      'Total de Episódios': entry.total_episodes || '?',
      'Progresso (%)': entry.total_episodes 
        ? Math.round(((entry.episodes_watched || 0) / entry.total_episodes) * 100) 
        : 0,
      'Nota': entry.rating || '-',
      'Favorito': entry.is_favorite ? 'Sim' : 'Não',
      'Data Início': entry.started_at || '-',
      'Data Conclusão': entry.completed_at || '-',
      'MAL ID': entry.mal_id,
      'Notas': entry.notes || '',
    }));
  };

  // Gera nome do arquivo
  const getFileName = (extension: string) => {
    const date = new Date().toISOString().split('T')[0];
    const name = username || 'minha-lista';
    return `anime-list-${name}-${date}.${extension}`;
  };

  // Exporta para Excel (XLSX)
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const data = formatDataForExport();
      
      // Cria workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Define larguras das colunas
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 40 },  // Título
        { wch: 15 },  // Status
        { wch: 18 },  // Episódios Assistidos
        { wch: 18 },  // Total de Episódios
        { wch: 14 },  // Progresso
        { wch: 8 },   // Nota
        { wch: 10 },  // Favorito
        { wch: 12 },  // Data Início
        { wch: 14 },  // Data Conclusão
        { wch: 10 },  // MAL ID
        { wch: 30 },  // Notas
      ];

      // Adiciona a worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Minha Lista de Animes');

      // Cria uma segunda aba com resumo
      const summary = [
        { 'Estatística': 'Total de Animes', 'Valor': entries.length },
        { 'Estatística': 'Assistindo', 'Valor': entries.filter(e => e.status === 'watching').length },
        { 'Estatística': 'Completos', 'Valor': entries.filter(e => e.status === 'completed').length },
        { 'Estatística': 'Pausados', 'Valor': entries.filter(e => e.status === 'paused').length },
        { 'Estatística': 'Abandonados', 'Valor': entries.filter(e => e.status === 'dropped').length },
        { 'Estatística': 'Planejo Assistir', 'Valor': entries.filter(e => e.status === 'not_started').length },
        { 'Estatística': 'Favoritos', 'Valor': entries.filter(e => e.is_favorite).length },
        { 'Estatística': 'Média de Nota', 'Valor': calculateAverageRating() },
        { 'Estatística': 'Total de Episódios', 'Valor': entries.reduce((acc, e) => acc + (e.episodes_watched || 0), 0) },
      ];
      
      const wsSummary = XLSX.utils.json_to_sheet(summary);
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

      // Exporta o arquivo
      XLSX.writeFile(wb, getFileName('xlsx'));
      toast.success('Lista exportada em Excel com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar para Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Calcula média de notas
  const calculateAverageRating = () => {
    const rated = entries.filter(e => e.rating);
    if (rated.length === 0) return '-';
    const avg = rated.reduce((acc, e) => acc + (e.rating || 0), 0) / rated.length;
    return avg.toFixed(2);
  };

  // Exporta para JSON
  const exportToJSON = () => {
    setIsExporting(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        username: username || null,
        totalAnimes: entries.length,
        statistics: {
          watching: entries.filter(e => e.status === 'watching').length,
          completed: entries.filter(e => e.status === 'completed').length,
          paused: entries.filter(e => e.status === 'paused').length,
          dropped: entries.filter(e => e.status === 'dropped').length,
          notStarted: entries.filter(e => e.status === 'not_started').length,
          favorites: entries.filter(e => e.is_favorite).length,
          totalEpisodes: entries.reduce((acc, e) => acc + (e.episodes_watched || 0), 0),
          averageRating: calculateAverageRating(),
        },
        animes: entries.map(entry => ({
          title: entry.title,
          malId: entry.mal_id,
          status: entry.status,
          statusLabel: statusLabels[entry.status] || entry.status,
          episodesWatched: entry.episodes_watched || 0,
          totalEpisodes: entry.total_episodes || null,
          rating: entry.rating || null,
          isFavorite: entry.is_favorite || false,
          startedAt: entry.started_at || null,
          completedAt: entry.completed_at || null,
          notes: entry.notes || null,
          imageUrl: entry.image_url || null,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
        })),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, getFileName('json'));
      toast.success('Lista exportada em JSON com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar JSON:', error);
      toast.error('Erro ao exportar para JSON');
    } finally {
      setIsExporting(false);
    }
  };

  // Exporta para CSV
  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const data = formatDataForExport();
      
      // Cabeçalhos
      const headers = Object.keys(data[0] || {});
      
      // Linhas
      const rows = data.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escapa valores com vírgulas ou aspas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );

      // Junta tudo com BOM para UTF-8
      const csv = '\ufeff' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, getFileName('csv'));
      toast.success('Lista exportada em CSV com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar para CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Função auxiliar para download
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Lista
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {entries.length} animes serão exportados
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
          <div className="flex flex-col">
            <span>Excel (XLSX)</span>
            <span className="text-xs text-muted-foreground">Planilha profissional com resumo</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} className="cursor-pointer">
          <FileJson className="h-4 w-4 mr-2 text-yellow-500" />
          <div className="flex flex-col">
            <span>JSON</span>
            <span className="text-xs text-muted-foreground">Formato estruturado para devs</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2 text-blue-500" />
          <div className="flex flex-col">
            <span>CSV</span>
            <span className="text-xs text-muted-foreground">Compatível com qualquer planilha</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
