// =============================================================================
// ZURT — Real Benchmark Data from BRAPI
// Fetches CDI (via prime rate), IPCA (inflation), and IBOV returns
// =============================================================================

import { logger } from '../utils/logger';

export interface BenchmarkPeriod {
  cdi: number;
  ipca: number;
  ibov: number;
}

export interface BenchmarkData {
  '1M': BenchmarkPeriod;
  '3M': BenchmarkPeriod;
  '6M': BenchmarkPeriod;
  '12M': BenchmarkPeriod;
}

const EMPTY_PERIOD: BenchmarkPeriod = { cdi: 0, ipca: 0, ibov: 0 };

export async function fetchBenchmarks(): Promise<BenchmarkData> {
  const results: BenchmarkData = {
    '1M': { ...EMPTY_PERIOD },
    '3M': { ...EMPTY_PERIOD },
    '6M': { ...EMPTY_PERIOD },
    '12M': { ...EMPTY_PERIOD },
  };

  // Fetch all three in parallel
  await Promise.all([
    fetchIBOV(results),
    fetchCDI(results),
    fetchIPCA(results),
  ]);

  return results;
}

async function fetchIBOV(results: BenchmarkData) {
  try {
    const res = await fetch('https://brapi.dev/api/quote/%5EBVSP?range=1y&interval=1mo');
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return;

    const history = result.historicalDataPrice || [];
    const currentPrice = result.regularMarketPrice;
    if (!currentPrice || history.length === 0) return;

    const getReturn = (monthsAgo: number) => {
      const idx = Math.max(0, history.length - monthsAgo - 1);
      const pastPrice = history[idx]?.close || history[0]?.close;
      return pastPrice ? ((currentPrice - pastPrice) / pastPrice) * 100 : 0;
    };

    results['1M'].ibov = getReturn(1);
    results['3M'].ibov = getReturn(3);
    results['6M'].ibov = getReturn(6);
    results['12M'].ibov = getReturn(12);
  } catch (err) {
    logger.log('[Benchmarks] IBOV fetch error:', err);
  }
}

async function fetchCDI(results: BenchmarkData) {
  try {
    const res = await fetch('https://brapi.dev/api/v2/prime-rate?country=brazil&sortBy=date&sortOrder=desc');
    const data = await res.json();
    const rates = data.prime_rate;
    if (!rates || rates.length === 0) return;

    const annualRate = rates[0].value; // e.g., 14.25
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;

    results['1M'].cdi = monthlyRate * 100;
    results['3M'].cdi = (Math.pow(1 + monthlyRate, 3) - 1) * 100;
    results['6M'].cdi = (Math.pow(1 + monthlyRate, 6) - 1) * 100;
    results['12M'].cdi = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
  } catch (err) {
    logger.log('[Benchmarks] CDI fetch error:', err);
  }
}

async function fetchIPCA(results: BenchmarkData) {
  try {
    const res = await fetch('https://brapi.dev/api/v2/inflation?country=brazil&sortBy=date&sortOrder=desc');
    const data = await res.json();
    const inflation = data.inflation;
    if (!inflation || inflation.length === 0) return;

    const monthlyRates = inflation.slice(0, 12).map((i: any) => (i.value ?? 0) / 100);

    const compound = (months: number) => {
      const rates = monthlyRates.slice(0, months);
      return (rates.reduce((acc: number, r: number) => acc * (1 + r), 1) - 1) * 100;
    };

    results['1M'].ipca = monthlyRates[0] ? monthlyRates[0] * 100 : 0;
    results['3M'].ipca = compound(3);
    results['6M'].ipca = compound(6);
    results['12M'].ipca = compound(12);
  } catch (err) {
    logger.log('[Benchmarks] IPCA fetch error:', err);
  }
}
