import type { Currency } from '../stores/settingsStore';
import { exchangeRates, currencySymbols, currencyLocales } from '../stores/settingsStore';

/**
 * Format number as BRL currency: R$ 847.350,00
 */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format value in the given currency, converting from BRL
 */
export function formatCurrency(value: number, currency: Currency = 'BRL'): string {
  const converted = value * exchangeRates[currency];
  const locale = currencyLocales[currency];
  return converted.toLocaleString(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format compact BRL: R$ 847,3K or R$ 1,2M
 */
export function formatBRLCompact(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}K`;
  }
  return formatBRL(value);
}

/**
 * Format percentage: +2,34% or -1,50%
 */
export function formatPct(value: number, showSign = true): string {
  const formatted = Math.abs(value).toFixed(2).replace('.', ',');
  if (showSign) {
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  }
  return `${formatted}%`;
}

/**
 * Format number with Brazilian locale: 847.350,00
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format relative date with optional i18n support.
 * If `t` is provided, uses time.* translation keys.
 */
export function formatRelativeDate(dateString: string, t?: (key: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (t) {
    if (diffMins < 1) return t('time.now');
    if (diffMins < 60) return t('time.minutesAgo').replace('{n}', String(diffMins));
    if (diffHours < 24) return t('time.hoursAgo').replace('{n}', String(diffHours));
    if (diffDays === 1) return t('time.yesterday');
    if (diffDays < 7) return t('time.daysAgo').replace('{n}', String(diffDays));
    if (diffDays < 30) return t('time.weeksAgo').replace('{n}', String(Math.floor(diffDays / 7)));
  } else {
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins}min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} sem`;
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Format date: "18 fev 2026"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format short date: "18/02"
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Mask value with asterisks using the current currency symbol
 */
export function maskValue(value: string, curr?: Currency): string {
  const symbol = curr ? currencySymbols[curr] : 'R$';
  return `${symbol} •••••`;
}

/**
 * Format currency input while typing — returns display string and raw number value.
 * Interprets all digits as cents (last 2 digits = decimal part).
 */
export function formatCurrencyInput(text: string, curr: Currency = 'BRL'): { display: string; raw: number } {
  const numbers = text.replace(/\D/g, '');
  const value = parseInt(numbers || '0', 10) / 100;
  const locale = currencyLocales[curr];
  const display = value.toLocaleString(locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 2,
  });
  return { display, raw: value };
}

