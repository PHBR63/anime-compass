import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

const ANIMATION_PREFS_KEY = 'animation-preferences';

export interface AnimationPreferences {
  pageTransitions: boolean;
  cursorEffects: boolean;
  reducedMotion: boolean;
}

const defaultPreferences: AnimationPreferences = {
  pageTransitions: true,
  cursorEffects: true,
  reducedMotion: false,
};

interface AnimationContextType {
  preferences: AnimationPreferences;
  setPreference: (key: keyof AnimationPreferences, value: boolean) => void;
  togglePreference: (key: keyof AnimationPreferences) => void;
  resetPreferences: () => void;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

interface AnimationPreferencesProviderProps {
  children: ReactNode;
}

export function AnimationPreferencesProvider(props: AnimationPreferencesProviderProps) {
  const [preferences, setPreferences] = useState<AnimationPreferences>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(ANIMATION_PREFS_KEY);
        if (stored) {
          return { ...defaultPreferences, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('[AnimationPrefs] Erro ao carregar:', e);
      }
      
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        return { ...defaultPreferences, reducedMotion: true, pageTransitions: false };
      }
    }
    return defaultPreferences;
  });

  const savePreferences = useCallback((prefs: AnimationPreferences) => {
    try {
      localStorage.setItem(ANIMATION_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('[AnimationPrefs] Erro ao salvar:', e);
    }
  }, []);

  const setPreference = useCallback((key: keyof AnimationPreferences, value: boolean) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, [key]: value };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const togglePreference = useCallback((key: keyof AnimationPreferences) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, [key]: !prev[key] };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    savePreferences(defaultPreferences);
  }, [savePreferences]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setPreference('reducedMotion', true);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setPreference]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ANIMATION_PREFS_KEY && event.newValue) {
        try {
          setPreferences(JSON.parse(event.newValue));
        } catch (e) {
          console.warn('[AnimationPrefs] Erro sync:', e);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const contextValue: AnimationContextType = {
    preferences,
    setPreference,
    togglePreference,
    resetPreferences,
  };

  return React.createElement(
    AnimationContext.Provider,
    { value: contextValue },
    props.children
  );
}

import React from 'react';

export function useAnimationPreferences(): AnimationContextType {
  const context = useContext(AnimationContext);
  
  if (!context) {
    return {
      preferences: defaultPreferences,
      setPreference: () => {},
      togglePreference: () => {},
      resetPreferences: () => {},
    };
  }
  
  return context;
}

export function useIsAnimationEnabled(type: 'pageTransitions' | 'cursorEffects'): boolean {
  const { preferences } = useAnimationPreferences();
  
  if (preferences.reducedMotion) {
    return false;
  }
  
  return preferences[type];
}
