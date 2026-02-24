// Demo exchange rates and conversion functions

import type { CurrencyCode, CurrencyRate } from '../types';

// Base rates relative to USD
const BASE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  BRL: 5.85,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CNY: 7.24,
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  BRL: 'R$ Real',
  USD: '$ Dollar',
  EUR: '\u20AC Euro',
  GBP: '\u00A3 Pound',
  JPY: '\u00A5 Yen',
  CNY: '\u00A5 Yuan',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  JPY: '\u00A5',
  CNY: '\u00A5',
};

export const ALL_CURRENCIES: CurrencyCode[] = ['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'];

export function getRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1;
  const fromUsd = BASE_RATES[from];
  const toUsd = BASE_RATES[to];
  return toUsd / fromUsd;
}

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  return amount * getRate(from, to);
}

function generateHistory(baseRate: number): number[] {
  const history: number[] = [];
  let rate = baseRate * 0.97;
  for (let i = 0; i < 30; i++) {
    rate += (Math.random() - 0.48) * baseRate * 0.008;
    rate = Math.max(rate, baseRate * 0.93);
    rate = Math.min(rate, baseRate * 1.07);
    history.push(Number(rate.toFixed(4)));
  }
  return history;
}

export function getRateWithHistory(from: CurrencyCode, to: CurrencyCode): CurrencyRate {
  const rate = getRate(from, to);
  return {
    from,
    to,
    rate,
    history: generateHistory(rate),
  };
}

export function getCrossRates(base: CurrencyCode): { code: CurrencyCode; rate: number }[] {
  return ALL_CURRENCIES.filter((c) => c !== base).map((code) => ({
    code,
    rate: getRate(base, code),
  }));
}
