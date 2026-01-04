import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * Retorna o valor com atraso configurável para evitar atualizações excessivas
 * 
 * @param value - Valor a ser debounced
 * @param delay - Tempo de espera em ms (padrão: 300ms)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configura timer para atualizar valor após delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa timer se value mudar antes do delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para debounce de estado (value + setter)
 * Útil quando você quer controlar tanto o valor imediato quanto o debounced
 * 
 * @param initialValue - Valor inicial
 * @param delay - Tempo de espera em ms (padrão: 300ms)
 */
export function useDebouncedState<T>(initialValue: T, delay: number = 300) {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, debouncedValue, setValue] as const;
}
