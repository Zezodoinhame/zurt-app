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
 * Format relative date: "ha 2h", "ontem", "ha 3 dias"
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} sem`;
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
 * Mask value with asterisks: R$ •••••
 */
export function maskValue(value: string): string {
  return 'R$ •••••';
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
