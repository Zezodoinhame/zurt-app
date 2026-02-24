// Exchange rates and conversion functions with BRAPI live data support

import type { CurrencyCode, CurrencyRate } from '../types';

// Hardcoded fallback rates relative to USD
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  BRL: 5.85,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CNY: 7.24,
};

// Mutable rates that can be updated with live data
let BASE_RATES: Record<CurrencyCode, number> = { ...FALLBACK_RATES };
let _lastUpdated: string | null = null;

/**
 * Fetch live rates from BRAPI and update BASE_RATES.
 * Returns the lastUpdated timestamp on success, or null on failure.
 */
export async function fetchLiveRates(): Promise<string | null> {
  try {
    const response = await fetch(
      'https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,BTC-BRL,JPY-BRL'
    );
    if (!response.ok) throw new Error(`BRAPI error: ${response.status}`);
    const data = await response.json();
    const currencies: any[] = data.currency ?? [];

    // Build a map of X-BRL => bidPrice
    const brlRates: Record<string, number> = {};
    for (const c of currencies) {
      const pair = c.fromCurrency + '-' + c.toCurrency;
      const bid = parseFloat(c.bidPrice);
      if (!isNaN(bid) && bid > 0) {
        brlRates[pair] = bid;
      }
    }

    // Update BASE_RATES: we have X-BRL pairs, so 1 X = bidPrice BRL
    // BASE_RATES are relative to USD, meaning BASE_RATES[CUR] = how many CUR per 1 USD
    // From BRAPI: USD-BRL gives us how many BRL per 1 USD
    const usdBrl = brlRates['USD-BRL'];
    if (usdBrl && usdBrl > 0) {
      BASE_RATES.BRL = usdBrl;
      BASE_RATES.USD = 1;

      // EUR-BRL => 1 EUR = x BRL, so EUR per 1 USD = usdBrl / eurBrl
      if (brlRates['EUR-BRL']) {
        BASE_RATES.EUR = usdBrl / brlRates['EUR-BRL'];
      }
      if (brlRates['GBP-BRL']) {
        BASE_RATES.GBP = usdBrl / brlRates['GBP-BRL'];
      }
      if (brlRates['JPY-BRL']) {
        // JPY-BRL => 1 JPY = x BRL (very small)
        // JPY per 1 USD = usdBrl / jpyBrl
        BASE_RATES.JPY = usdBrl / brlRates['JPY-BRL'];
      }
      // CNY not in BRAPI response, keep fallback
    }

    _lastUpdated = new Date().toISOString();
    return _lastUpdated;
  } catch (err) {
    console.warn('BRAPI fetch failed, using fallback rates:', err);
    return null;
  }
}

export function getLastUpdated(): string | null {
  return _lastUpdated;
}

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
