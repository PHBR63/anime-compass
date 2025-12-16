import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook para traduzir texto usando Lovable AI
export function useTranslation(text: string | null | undefined) {
  return useQuery({
    queryKey: ['translation', text],
    queryFn: async () => {
      if (!text || text.trim() === '') return '';

      const { data, error } = await supabase.functions.invoke('translate-synopsis', {
        body: { text }
      });

      if (error) {
        console.error('Translation error:', error);
        throw error;
      }

      return data.translation as string;
    },
    enabled: !!text && text.trim().length > 0,
    staleTime: 1000 * 60 * 60 * 24, // Cache por 24h (traduções não mudam)
    gcTime: 1000 * 60 * 60 * 24 * 7, // Manter em cache por 7 dias
    retry: 1,
  });
}
