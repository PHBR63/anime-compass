/**
 * Hook para feedback háptico (vibração) em dispositivos móveis
 * Usa a API Vibration quando disponível
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Padrões de vibração em milissegundos
const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  warning: [30, 50, 30],
  error: [50, 100, 50],
  selection: 5,
};

/**
 * Verifica se a API Vibration está disponível
 */
const isVibrationSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Hook que retorna funções para feedback háptico
 */
export function useHapticFeedback() {
  /**
   * Dispara uma vibração com o padrão especificado
   */
  const trigger = (pattern: HapticPattern = 'medium'): boolean => {
    if (!isVibrationSupported()) return false;
    
    try {
      const vibrationPattern = hapticPatterns[pattern];
      return navigator.vibrate(vibrationPattern);
    } catch {
      return false;
    }
  };

  /**
   * Vibração leve - para seleção/toque
   */
  const light = () => trigger('light');

  /**
   * Vibração média - para ações importantes
   */
  const medium = () => trigger('medium');

  /**
   * Vibração pesada - para ações críticas
   */
  const heavy = () => trigger('heavy');

  /**
   * Vibração de sucesso - padrão crescente
   */
  const success = () => trigger('success');

  /**
   * Vibração de aviso
   */
  const warning = () => trigger('warning');

  /**
   * Vibração de erro
   */
  const error = () => trigger('error');

  /**
   * Vibração de seleção - muito leve
   */
  const selection = () => trigger('selection');

  /**
   * Para a vibração atual
   */
  const cancel = (): boolean => {
    if (!isVibrationSupported()) return false;
    return navigator.vibrate(0);
  };

  return {
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
    cancel,
    isSupported: isVibrationSupported(),
  };
}

/**
 * Função utilitária para vibrar sem usar o hook
 */
export function vibrate(pattern: HapticPattern = 'medium'): boolean {
  if (!isVibrationSupported()) return false;
  
  try {
    const vibrationPattern = hapticPatterns[pattern];
    return navigator.vibrate(vibrationPattern);
  } catch {
    return false;
  }
}