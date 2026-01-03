/**
 * Hook para gerenciar preferências de tradução
 * Persiste no localStorage a preferência de tradução automática
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'anicheck_translation_prefs';

interface TranslationPreferences {
  autoTranslate: boolean; // Traduzir automaticamente sinopses em inglês
}

const defaultPreferences: TranslationPreferences = {
  autoTranslate: false,
};

/**
 * Hook para gerenciar preferências de tradução
 */
export function useTranslationPreferences() {
  const [preferences, setPreferences] = useState<TranslationPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[TranslationPrefs] Erro ao ler preferências:', e);
    }
    return defaultPreferences;
  });

  // Salva preferências no localStorage quando mudam
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('[TranslationPrefs] Erro ao salvar preferências:', e);
    }
  }, [preferences]);

  /**
   * Alterna a preferência de tradução automática
   */
  const toggleAutoTranslate = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      autoTranslate: !prev.autoTranslate,
    }));
  }, []);

  /**
   * Define a preferência de tradução automática
   */
  const setAutoTranslate = useCallback((value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      autoTranslate: value,
    }));
  }, []);

  return {
    preferences,
    toggleAutoTranslate,
    setAutoTranslate,
    isAutoTranslateEnabled: preferences.autoTranslate,
  };
}
