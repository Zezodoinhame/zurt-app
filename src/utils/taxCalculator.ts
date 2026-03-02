// Brazilian Investment Tax Calculator
// Pure TypeScript utility functions for calculating taxes on Brazilian investments.
// Based on current Brazilian tax rules for variable income, FIIs, fixed income, and crypto.

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category?: string;
  [key: string]: any;
}

interface Investment {
  id: string;
  name: string;
  ticker?: string;
  class: string; // 'stocks', 'fiis', 'fixedIncome', 'crypto', etc.
  institution?: string;
  quantity?: number;
  averagePrice?: number;
  currentPrice?: number;
  investedValue?: number;
  currentValue?: number;
  variation?: number;
  [key: string]: any;
}

export interface TaxResult {
  rendaVariavel: {
    vendasMes: number;
    lucro: number;
    prejuizoAcumulado: number;
    isento: boolean;
    irDevido: number;
    aliquota: number;
  };
  fiis: {
    rendimentos: number;
    lucroVenda: number;
    irDevido: number;
  };
  rendaFixa: {
    rendimentos: number;
    irRetido: number;
    aliquota: number;
  };
  cripto: {
    vendasMes: number;
    isento: boolean;
    irDevido: number;
  };
  totalIR: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Regressive IR table for fixed income (tabela regressiva do IR). */
export const RENDA_FIXA_TABLE = [
  { minDays: 0, maxDays: 180, rate: 0.225, label: 'Ate 180 dias: 22,5%' },
  { minDays: 181, maxDays: 360, rate: 0.20, label: '181 a 360 dias: 20%' },
  { minDays: 361, maxDays: 720, rate: 0.175, label: '361 a 720 dias: 17,5%' },
  { minDays: 721, maxDays: Infinity, rate: 0.15, label: 'Acima de 720 dias: 15%' },
];

/** Fixed income products exempt from IR. */
export const RENDA_FIXA_ISENTOS = ['LCI', 'LCA', 'CRI', 'CRA'];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Returns the IR aliquota for fixed income based on the number of calendar days
 * the investment has been held (tabela regressiva).
 */
export function getRendaFixaAliquota(diasCorridos: number): number {
  if (diasCorridos <= 180) return 0.225;
  if (diasCorridos <= 360) return 0.20;
  if (diasCorridos <= 720) return 0.175;
  return 0.15;
}

/**
 * Returns true when total stock sales in the month are within the tax-exempt
 * threshold of R$ 20.000,00.
 */
export function isAcoesIsento(totalVendasMes: number): boolean {
  return totalVendasMes <= 20000;
}

/**
 * Returns true when total crypto sales in the month are within the tax-exempt
 * threshold of R$ 35.000,00.
 */
export function isCriptoIsento(totalVendasMes: number): boolean {
  return totalVendasMes <= 35000;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safely coerce a possibly-undefined / null number to 0. */
function safeNumber(value: number | undefined | null): number {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  return value;
}

/** Check whether an investment's class matches one of the given keywords. */
function classMatches(investmentClass: string, keywords: string[]): boolean {
  const lower = (investmentClass ?? '').toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Calculate estimated Brazilian investment taxes for a given month/year.
 *
 * This is a simplified calculator that uses portfolio snapshot data (current
 * values vs invested values) as a proxy for realised gains. A production
 * implementation would use actual sell transactions and DARF history.
 *
 * @param transactions - Array of transactions (reserved for future use).
 * @param investments  - Array of investment positions.
 * @param period       - The target month and year.
 * @returns A {@link TaxResult} with the tax breakdown per category.
 */
export function calculateTaxes(
  transactions: Transaction[],
  investments: Investment[],
  period: { month: number; year: number }
): TaxResult {
  // Guarantee we are working with arrays even if the caller passes null/undefined.
  const safeInvestments: Investment[] = Array.isArray(investments) ? investments : [];

  // -------------------------------------------------------------------
  // 1. Partition investments by class
  // -------------------------------------------------------------------
  const stocks = safeInvestments.filter((inv) =>
    classMatches(inv.class, ['stocks', 'acoes', 'ações'])
  );
  const fiis = safeInvestments.filter((inv) =>
    classMatches(inv.class, ['fiis', 'fii'])
  );
  const fixedIncome = safeInvestments.filter((inv) =>
    classMatches(inv.class, ['fixedincome', 'fixed', 'renda'])
  );
  const crypto = safeInvestments.filter((inv) =>
    classMatches(inv.class, ['crypto', 'cripto'])
  );

  // -------------------------------------------------------------------
  // 2. Stocks (Renda Variavel)
  // -------------------------------------------------------------------
  const stockVendasMes = stocks.reduce(
    (sum, inv) => sum + safeNumber(inv.currentValue),
    0
  );

  const stockLucro = stocks.reduce(
    (sum, inv) =>
      sum + (safeNumber(inv.currentValue) - safeNumber(inv.investedValue)),
    0
  );

  const stockIsento = isAcoesIsento(stockVendasMes);
  const stockAliquota = 0.15; // swing trade default

  let stockIrDevido = 0;
  let stockPrejuizoAcumulado = 0;

  if (stockLucro < 0) {
    stockIrDevido = 0;
    stockPrejuizoAcumulado = Math.abs(stockLucro);
  } else if (stockIsento) {
    stockIrDevido = 0;
  } else {
    stockIrDevido = stockLucro * stockAliquota;
  }

  // -------------------------------------------------------------------
  // 3. FIIs (Fundos Imobiliarios)
  // -------------------------------------------------------------------
  const fiiRendimentos = fiis.reduce(
    (sum, inv) => sum + safeNumber(inv.currentValue),
    0
  );

  const fiiLucroVenda = fiis.reduce((sum, inv) => {
    const gain = safeNumber(inv.currentValue) - safeNumber(inv.investedValue);
    return sum + (gain > 0 ? gain : 0);
  }, 0);

  const fiiIrDevido = fiiLucroVenda > 0 ? fiiLucroVenda * 0.20 : 0;

  // -------------------------------------------------------------------
  // 4. Fixed Income (Renda Fixa)
  // -------------------------------------------------------------------
  const fixedRendimentos = fixedIncome.reduce(
    (sum, inv) =>
      sum + (safeNumber(inv.currentValue) - safeNumber(inv.investedValue)),
    0
  );

  const fixedAliquota = 0.175; // simplified average
  const fixedIrRetido =
    fixedRendimentos > 0 ? fixedRendimentos * fixedAliquota : 0;

  // -------------------------------------------------------------------
  // 5. Crypto
  // -------------------------------------------------------------------
  const cryptoVendasMes = crypto.reduce(
    (sum, inv) => sum + safeNumber(inv.currentValue),
    0
  );

  const cryptoIsento = isCriptoIsento(cryptoVendasMes);

  let cryptoIrDevido = 0;
  if (!cryptoIsento) {
    const cryptoLucro = crypto.reduce(
      (sum, inv) =>
        sum + (safeNumber(inv.currentValue) - safeNumber(inv.investedValue)),
      0
    );
    cryptoIrDevido = cryptoLucro > 0 ? cryptoLucro * 0.15 : 0;
  }

  // -------------------------------------------------------------------
  // 6. Total IR (only positive contributions)
  // -------------------------------------------------------------------
  const totalIR =
    Math.max(stockIrDevido, 0) +
    Math.max(fiiIrDevido, 0) +
    Math.max(fixedIrRetido, 0) +
    Math.max(cryptoIrDevido, 0);

  // -------------------------------------------------------------------
  // Build result
  // -------------------------------------------------------------------
  const result: TaxResult = {
    rendaVariavel: {
      vendasMes: stockVendasMes,
      lucro: stockLucro,
      prejuizoAcumulado: stockPrejuizoAcumulado,
      isento: stockIsento,
      irDevido: stockIrDevido,
      aliquota: stockAliquota,
    },
    fiis: {
      rendimentos: fiiRendimentos,
      lucroVenda: fiiLucroVenda,
      irDevido: fiiIrDevido,
    },
    rendaFixa: {
      rendimentos: fixedRendimentos,
      irRetido: fixedIrRetido,
      aliquota: fixedAliquota,
    },
    cripto: {
      vendasMes: cryptoVendasMes,
      isento: cryptoIsento,
      irDevido: cryptoIrDevido,
    },
    totalIR,
  };

  return result;
}
