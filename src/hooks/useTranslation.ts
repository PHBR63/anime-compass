import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'anicheck_translations';
const CACHE_VERSION = 1;

// Estrutura do cache local
interface TranslationCache {
  version: number;
  translations: Record<string, { text: string; timestamp: number }>;
}

// Carrega cache do localStorage
function getLocalCache(): TranslationCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as TranslationCache;
      // Verifica versão do cache
      if (parsed.version === CACHE_VERSION) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache de traduções:', e);
  }
  return { version: CACHE_VERSION, translations: {} };
}

// Salva tradução no cache local
function saveToLocalCache(key: string, translation: string) {
  try {
    const cache = getLocalCache();
    cache.translations[key] = {
      text: translation,
      timestamp: Date.now()
    };
    
    // Limpa entradas antigas (mais de 30 dias)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    Object.keys(cache.translations).forEach(k => {
      if (cache.translations[k].timestamp < thirtyDaysAgo) {
        delete cache.translations[k];
      }
    });
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Erro ao salvar cache de traduções:', e);
  }
}

// Gera chave de cache baseada no texto (hash simples)
function generateCacheKey(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `t_${hash}`;
}

// Busca tradução do cache local
function getFromLocalCache(text: string): string | null {
  const cache = getLocalCache();
  const key = generateCacheKey(text);
  return cache.translations[key]?.text || null;
}

// Hook para traduzir texto usando Lovable AI com cache local persistente
export function useTranslation(text: string | null | undefined) {
  return useQuery({
    queryKey: ['translation', text],
    queryFn: async () => {
      if (!text || text.trim() === '') return '';

      // Verifica cache local primeiro
      const cachedTranslation = getFromLocalCache(text);
      if (cachedTranslation) {
        console.log('Tradução encontrada no cache local');
        return cachedTranslation;
      }

      // Se não encontrou, busca da API
      const { data, error } = await supabase.functions.invoke('translate-synopsis', {
        body: { text }
      });

      if (error) {
        console.error('Erro na tradução:', error);
        throw error;
      }

      const translation = data.translation as string;
      
      // Salva no cache local
      if (translation) {
        saveToLocalCache(generateCacheKey(text), translation);
      }

      return translation;
    },
    enabled: !!text && text.trim().length > 0,
    staleTime: Infinity, // Nunca considera stale se já tem dados
    gcTime: 1000 * 60 * 60 * 24 * 7, // Manter em memória por 7 dias
    retry: 1,
  });
}

// Função utilitária para limpar o cache de traduções
export function clearTranslationCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('Erro ao limpar cache:', e);
  }
}
