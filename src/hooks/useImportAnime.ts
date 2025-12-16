import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AnimeStatus = Database['public']['Enums']['anime_status'];

// Interface para o formato do JSON de importação
interface ImportedAnime {
  id: string;
  title: string;
  title_english?: string | null;
  year?: number | null;
  episodes: number | null;
  score?: number | null;
  synopsis?: string | null;
  image_url: string | null;
  genres?: { id: number; name: string }[];
  user_entry: {
    status: string;
    rating: string | null;
    episodes_watched: number;
    is_favorite: boolean;
    is_archived: boolean;
    personal_notes: string | null;
    created_at: string;
    updated_at: string;
  };
}

interface ImportFile {
  version: string;
  exportDate: string;
  totalAnimes: number;
  animes: ImportedAnime[];
}

// Interface para resultado de busca na Jikan
interface JikanSearchResult {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images: {
    jpg: {
      large_image_url: string;
    };
  };
  episodes: number | null;
}

// Interface para progresso de importação
export interface ImportProgress {
  current: number;
  total: number;
  phase: 'validating' | 'searching' | 'checking_duplicates' | 'importing' | 'done';
  currentAnime?: string;
  imported: number;
  skipped: number;
  notFound: number;
  duplicates: number;
  errors: string[];
}

// Interface para resultado final
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  notFound: string[];
  duplicates: string[];
  errors: string[];
}

// Mapeamento de status do JSON para status do sistema
const mapStatus = (status: string): AnimeStatus => {
  const statusMap: Record<string, AnimeStatus> = {
    'watching': 'watching',
    'completed': 'completed',
    'paused': 'paused',
    'dropped': 'dropped',
    'not_started': 'not_started',
    'plan_to_watch': 'not_started',
  };
  return statusMap[status] || 'not_started';
};

// Função para buscar mal_id na API Jikan com rate limiting
const searchMalId = async (title: string): Promise<JikanSearchResult | null> => {
  try {
    const response = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=5`
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited, aguardar e tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1500));
        return searchMalId(title);
      }
      return null;
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Tentar encontrar correspondência exata primeiro
      const exactMatch = data.data.find(
        (anime: JikanSearchResult) => 
          anime.title.toLowerCase() === title.toLowerCase() ||
          anime.title_english?.toLowerCase() === title.toLowerCase()
      );
      
      return exactMatch || data.data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar na Jikan:', error);
    return null;
  }
};

// Delay para rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useImportAnime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  
  // Validar estrutura do arquivo JSON
  const validateFile = useCallback((content: string): ImportFile | null => {
    try {
      const data = JSON.parse(content);
      
      if (!data.animes || !Array.isArray(data.animes)) {
        toast.error('Arquivo inválido: estrutura incorreta');
        return null;
      }
      
      return data as ImportFile;
    } catch (error) {
      toast.error('Arquivo JSON inválido');
      return null;
    }
  }, []);
  
  // Buscar animes existentes do usuário
  const getExistingAnimes = useCallback(async (): Promise<Set<number>> => {
    if (!user) return new Set();
    
    const { data, error } = await supabase
      .from('anime_entries')
      .select('mal_id')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Erro ao buscar animes existentes:', error);
      return new Set();
    }
    
    return new Set(data?.map(e => e.mal_id) || []);
  }, [user]);
  
  // Função principal de importação
  const importAnimes = useCallback(async (fileContent: string): Promise<ImportResult> => {
    if (!user) {
      return { success: false, imported: 0, skipped: 0, notFound: [], duplicates: [], errors: ['Usuário não autenticado'] };
    }
    
    setIsImporting(true);
    
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      notFound: [],
      duplicates: [],
      errors: [],
    };
    
    try {
      // Fase 1: Validação
      setProgress({
        current: 0,
        total: 0,
        phase: 'validating',
        imported: 0,
        skipped: 0,
        notFound: 0,
        duplicates: 0,
        errors: [],
      });
      
      const importData = validateFile(fileContent);
      if (!importData) {
        result.errors.push('Arquivo inválido');
        return result;
      }
      
      const animes = importData.animes;
      const total = animes.length;
      
      // Fase 2: Verificar duplicatas existentes
      setProgress(prev => ({
        ...prev!,
        phase: 'checking_duplicates',
        total,
      }));
      
      const existingMalIds = await getExistingAnimes();
      
      // Fase 3: Buscar mal_ids e importar
      setProgress(prev => ({
        ...prev!,
        phase: 'searching',
      }));
      
      for (let i = 0; i < animes.length; i++) {
        const anime = animes[i];
        
        setProgress(prev => ({
          ...prev!,
          current: i + 1,
          currentAnime: anime.title,
          phase: 'searching',
        }));
        
        // Buscar mal_id na Jikan
        const jikanResult = await searchMalId(anime.title);
        
        // Rate limiting: aguardar 350ms entre requests (aprox. 3 req/s)
        await delay(350);
        
        if (!jikanResult) {
          result.notFound.push(anime.title);
          setProgress(prev => ({
            ...prev!,
            notFound: prev!.notFound + 1,
          }));
          continue;
        }
        
        // Verificar se já existe
        if (existingMalIds.has(jikanResult.mal_id)) {
          result.duplicates.push(anime.title);
          setProgress(prev => ({
            ...prev!,
            duplicates: prev!.duplicates + 1,
            skipped: prev!.skipped + 1,
          }));
          continue;
        }
        
        // Mapear status
        const status = mapStatus(anime.user_entry.status);
        const totalEpisodes = jikanResult.episodes || anime.episodes || null;
        
        // Se completado, definir episódios assistidos como total
        let episodesWatched = anime.user_entry.episodes_watched || 0;
        if (status === 'completed' && totalEpisodes) {
          episodesWatched = totalEpisodes;
        }
        
        // Mapear rating (string "1"-"5" para number 1-5)
        let rating: number | null = null;
        if (anime.user_entry.rating) {
          const parsed = parseInt(anime.user_entry.rating);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
            rating = parsed;
          }
        }
        
        // Inserir no banco
        setProgress(prev => ({
          ...prev!,
          phase: 'importing',
          currentAnime: anime.title,
        }));
        
        const { error: insertError } = await supabase
          .from('anime_entries')
          .insert({
            user_id: user.id,
            mal_id: jikanResult.mal_id,
            title: anime.title,
            image_url: jikanResult.images?.jpg?.large_image_url || anime.image_url,
            total_episodes: totalEpisodes,
            episodes_watched: episodesWatched,
            status,
            rating,
            is_favorite: anime.user_entry.is_favorite || false,
            is_archived: anime.user_entry.is_archived || false,
            notes: anime.user_entry.personal_notes,
            completed_at: status === 'completed' ? new Date().toISOString().split('T')[0] : null,
          });
        
        if (insertError) {
          result.errors.push(`Erro ao importar ${anime.title}: ${insertError.message}`);
          setProgress(prev => ({
            ...prev!,
            errors: [...prev!.errors, anime.title],
          }));
        } else {
          result.imported++;
          existingMalIds.add(jikanResult.mal_id); // Evitar duplicatas no mesmo import
          setProgress(prev => ({
            ...prev!,
            imported: prev!.imported + 1,
          }));
        }
      }
      
      // Fase final
      setProgress(prev => ({
        ...prev!,
        phase: 'done',
      }));
      
      result.success = true;
      result.skipped = result.duplicates.length + result.notFound.length;
      
      // Invalidar queries para atualizar a lista
      await queryClient.invalidateQueries({ queryKey: ['animeEntries'] });
      await queryClient.invalidateQueries({ queryKey: ['userStats'] });
      
      if (result.imported > 0) {
        toast.success(`${result.imported} anime(s) importado(s) com sucesso!`);
      }
      
      return result;
    } catch (error) {
      console.error('Erro durante importação:', error);
      result.errors.push('Erro inesperado durante a importação');
      return result;
    } finally {
      setIsImporting(false);
    }
  }, [user, validateFile, getExistingAnimes, queryClient]);
  
  // Resetar progresso
  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);
  
  return {
    importAnimes,
    isImporting,
    progress,
    resetProgress,
  };
}
