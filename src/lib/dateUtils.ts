/**
 * Utilitários centralizados de formatação de datas
 * Usa APIs nativas do JavaScript (Intl) para evitar dependências externas
 */

// Formatador de data padrão PT-BR
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

// Formatador de data e hora
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// Formatador apenas hora
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

// Formatador de mês e ano
const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

// Formatador de data extenso
const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Formata uma data para exibição no formato DD/MM/YYYY
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return dateFormatter.format(d);
  } catch {
    return '';
  }
}

/**
 * Formata uma data com hora no formato DD/MM/YYYY HH:MM
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return dateTimeFormatter.format(d);
  } catch {
    return '';
  }
}

/**
 * Formata apenas a hora no formato HH:MM
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return timeFormatter.format(d);
  } catch {
    return '';
  }
}

/**
 * Formata mês e ano (ex: "janeiro de 2024")
 */
export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return monthYearFormatter.format(d);
  } catch {
    return '';
  }
}

/**
 * Formata data por extenso (ex: "segunda-feira, 15 de janeiro de 2024")
 */
export function formatLongDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return longDateFormatter.format(d);
  } catch {
    return '';
  }
}

// Unidades de tempo em milissegundos
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formata tempo relativo (ex: "há 5 minutos", "daqui a 2 dias")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const now = Date.now();
    const diff = now - d.getTime();
    const absDiff = Math.abs(diff);
    
    const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    
    // Determina unidade apropriada
    if (absDiff < MINUTE) {
      return rtf.format(Math.round(-diff / 1000), 'second');
    } else if (absDiff < HOUR) {
      return rtf.format(Math.round(-diff / MINUTE), 'minute');
    } else if (absDiff < DAY) {
      return rtf.format(Math.round(-diff / HOUR), 'hour');
    } else if (absDiff < WEEK) {
      return rtf.format(Math.round(-diff / DAY), 'day');
    } else if (absDiff < MONTH) {
      return rtf.format(Math.round(-diff / WEEK), 'week');
    } else if (absDiff < YEAR) {
      return rtf.format(Math.round(-diff / MONTH), 'month');
    } else {
      return rtf.format(Math.round(-diff / YEAR), 'year');
    }
  } catch {
    return '';
  }
}

/**
 * Verifica se uma data é hoje
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Verifica se uma data é ontem
 */
export function isYesterday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Formata data de forma inteligente:
 * - Hoje: "Hoje às HH:MM"
 * - Ontem: "Ontem às HH:MM"
 * - Última semana: "Segunda às HH:MM"
 * - Mais antigo: "DD/MM/YYYY"
 */
export function formatSmartDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const time = formatTime(d);
    
    if (isToday(d)) {
      return `Hoje às ${time}`;
    }
    
    if (isYesterday(d)) {
      return `Ontem às ${time}`;
    }
    
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // Se for na última semana, mostra o dia da semana
    if (diff < WEEK) {
      const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
      const weekday = weekdayFormatter.format(d);
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} às ${time}`;
    }
    
    // Caso contrário, mostra a data completa
    return formatDate(d);
  } catch {
    return '';
  }
}

/**
 * Retorna a diferença em dias entre duas datas
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    const diff = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diff / DAY);
  } catch {
    return 0;
  }
}
