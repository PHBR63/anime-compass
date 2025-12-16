import { useState, useEffect, useCallback } from 'react';

/**
 * Tipos de temas disponíveis no sistema
 */
export type ThemeType = 'cyberpunk' | 'sakura' | 'ocean' | 'forest' | 'sunset' | 'midnight';

/**
 * Configuração de cada tema
 */
export interface ThemeConfig {
  id: ThemeType;
  name: string;
  description: string;
  fontBody: string;
  fontDisplay: string;
  preview: {
    primary: string;
    accent: string;
    background: string;
  };
}

/**
 * Lista de temas disponíveis com suas configurações
 */
export const THEMES: ThemeConfig[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon vibrante com visual futurista',
    fontBody: 'Outfit',
    fontDisplay: 'Orbitron',
    preview: {
      primary: '#00d4ff',
      accent: '#a855f7',
      background: '#0a0f1a',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Suave e elegante como flores de cerejeira',
    fontBody: 'Quicksand',
    fontDisplay: 'Noto Sans JP',
    preview: {
      primary: '#f472b6',
      accent: '#fb7185',
      background: '#fdf2f8',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Profundo e calmo como o mar',
    fontBody: 'Outfit',
    fontDisplay: 'Space Grotesk',
    preview: {
      primary: '#0ea5e9',
      accent: '#06b6d4',
      background: '#0c1929',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural e aconchegante como a floresta',
    fontBody: 'Quicksand',
    fontDisplay: 'Playfair Display',
    preview: {
      primary: '#22c55e',
      accent: '#84cc16',
      background: '#0f1f14',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Quente e vibrante como o pôr do sol',
    fontBody: 'Outfit',
    fontDisplay: 'Bebas Neue',
    preview: {
      primary: '#f97316',
      accent: '#eab308',
      background: '#1a0f0a',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Elegante e minimalista na escuridão',
    fontBody: 'Outfit',
    fontDisplay: 'Dela Gothic One',
    preview: {
      primary: '#a78bfa',
      accent: '#c084fc',
      background: '#09090b',
    },
  },
];

const THEME_STORAGE_KEY = 'anicheck-theme';

/**
 * Hook para gerenciar o tema da aplicação
 * Persiste a escolha do usuário no localStorage
 */
export function useTheme() {
  // Inicializa com o tema salvo ou o padrão (cyberpunk)
  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && THEMES.some(t => t.id === saved)) {
        return saved as ThemeType;
      }
    }
    return 'cyberpunk';
  });

  // Aplica o tema ao documento
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove todos os temas anteriores
    THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
    
    // Adiciona o novo tema
    root.classList.add(`theme-${theme}`);
    
    // Salva no localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Função para mudar o tema
  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
  }, []);

  // Retorna a configuração do tema atual
  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

  return {
    theme,
    setTheme,
    currentTheme,
    themes: THEMES,
  };
}
