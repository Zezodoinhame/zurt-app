import axios from 'axios';

const BRAPI_BASE = 'https://brapi.dev';
const BRAPI_TOKEN = 'oGyA32WeSm3GvWhsLjKHxX';

const brapi = axios.create({
  baseURL: BRAPI_BASE,
  timeout: 15000,
});

// Interceptor para adicionar token
brapi.interceptors.request.use((config) => {
  if (BRAPI_TOKEN) {
    config.params = { ...config.params, token: BRAPI_TOKEN };
  }
  return config;
});

export const brapiService = {
  // === AÇÕES / FIIs / ETFs / BDRs ===

  // Cotação detalhada de 1 ou mais tickers
  async getQuote(tickers: string | string[], options?: {
    range?: '1d'|'5d'|'1mo'|'3mo'|'6mo'|'1y'|'2y'|'5y'|'10y'|'ytd'|'max';
    interval?: '1m'|'2m'|'5m'|'15m'|'30m'|'60m'|'90m'|'1h'|'1d'|'5d'|'1wk'|'1mo'|'3mo';
    fundamental?: boolean;
    dividends?: boolean;
    modules?: string[];
  }) {
    const tickerStr = Array.isArray(tickers) ? tickers.join(',') : tickers;
    const params: any = {};
    if (options?.range) params.range = options.range;
    if (options?.interval) params.interval = options.interval;
    if (options?.fundamental) params.fundamental = true;
    if (options?.dividends) params.dividends = true;
    if (options?.modules) params.modules = options.modules.join(',');

    const { data } = await brapi.get(`/api/quote/${tickerStr}`, { params });
    return data.results;
  },

  // Listar ativos com filtro e paginação
  async listQuotes(options?: {
    search?: string;
    sortBy?: 'name'|'close'|'change'|'change_abs'|'volume'|'market_cap_basic';
    sortOrder?: 'asc'|'desc';
    limit?: number;
    page?: number;
    type?: 'stock'|'fund'|'bdr';
    sector?: string;
  }) {
    const { data } = await brapi.get('/api/quote/list', { params: options });
    return data;
  },

  // Verificar ativos disponíveis
  async getAvailable(search?: string) {
    const params = search ? { search } : {};
    const { data } = await brapi.get('/api/available', { params });
    return data;
  },

  // === CRIPTOMOEDAS ===

  async getCrypto(coins?: string, currency?: string) {
    const params: any = {};
    if (coins) params.coin = coins;
    if (currency) params.currency = currency;
    const { data } = await brapi.get('/api/v2/crypto', { params });
    return data.coins;
  },

  async getCryptoAvailable() {
    const { data } = await brapi.get('/api/v2/crypto/available');
    return data.coins;
  },

  // === CÂMBIO ===

  async getCurrency(currencies?: string) {
    const params: any = {};
    if (currencies) params.currency = currencies;
    const { data } = await brapi.get('/api/v2/currency', { params });
    return data.currency;
  },

  async getCurrencyAvailable() {
    const { data } = await brapi.get('/api/v2/currency/available');
    return data;
  },

  // === INFLAÇÃO ===

  async getInflation(country?: string, options?: { historical?: boolean; start?: string; end?: string }) {
    const params: any = {};
    if (country) params.country = country;
    if (options?.historical) params.historical = true;
    if (options?.start) params.start = options.start;
    if (options?.end) params.end = options.end;
    const { data } = await brapi.get('/api/v2/inflation', { params });
    return data.inflation;
  },

  // === TAXA SELIC / PRIME RATE ===

  async getPrimeRate(country?: string, options?: { historical?: boolean; start?: string; end?: string }) {
    const params: any = {};
    if (country) params.country = country;
    if (options?.historical) params.historical = true;
    if (options?.start) params.start = options.start;
    if (options?.end) params.end = options.end;
    const { data } = await brapi.get('/api/v2/prime-rate', { params });
    return data['prime-rate'];
  },
};
