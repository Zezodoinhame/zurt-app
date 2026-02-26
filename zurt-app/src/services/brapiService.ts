import axios from 'axios';

const BRAPI_TOKEN = 'oGyA32WeSm3GvWhsLjKHxX';
const BASE_URL = 'https://brapi.dev';

const brapiApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  params: { token: BRAPI_TOKEN },
});

export const brapiService = {

  // 1. Cotação de ações/FIIs/ETFs/BDRs/índices
  async getQuote(tickers: string, params?: {
    range?: '1d'|'5d'|'1mo'|'3mo'|'6mo'|'1y'|'2y'|'5y'|'10y'|'max';
    interval?: '1d'|'1wk'|'1mo';
    fundamental?: boolean;
    dividends?: boolean;
    modules?: string[];
  }) {
    const modules = params?.modules?.join(',');
    const { data } = await brapiApi.get(`/api/quote/${tickers}`, {
      params: {
        range: params?.range,
        interval: params?.interval,
        fundamental: params?.fundamental,
        dividends: params?.dividends,
        modules,
      },
    });
    return data.results;
  },

  // 2. Listar todos os ativos
  async listStocks(params?: {
    search?: string;
    sortBy?: 'name'|'close'|'change'|'change_abs'|'volume'|'market_cap_basic';
    sortOrder?: 'asc'|'desc';
    limit?: number;
    page?: number;
    type?: 'stock'|'fund'|'bdr';
  }) {
    const { data } = await brapiApi.get('/api/quote/list', { params });
    return data;
  },

  // 3. Ativos disponíveis
  async getAvailable(search?: string) {
    const { data } = await brapiApi.get('/api/available', {
      params: { search },
    });
    return data;
  },

  // 4. Crypto
  async getCryptos(params?: {
    coin?: string;
    currency?: string;
  }) {
    const { data } = await brapiApi.get('/api/v2/crypto', {
      params: {
        coin: params?.coin || 'BTC,ETH,SOL,ADA,XRP,DOT,AVAX,MATIC,LINK,UNI',
        currency: params?.currency || 'BRL',
      },
    });
    return data.coins || [];
  },

  // 5. Moedas
  async getCurrencies(params?: {
    currency?: string;
  }) {
    const { data } = await brapiApi.get('/api/v2/currency', {
      params: {
        currency: params?.currency || 'USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL,CNY-BRL,ARS-BRL,BTC-BRL',
      },
    });
    return data.currency || [];
  },

  // 6. Inflação
  async getInflation(params?: {
    country?: string;
    historical?: boolean;
    start?: string;
    end?: string;
    sortBy?: 'date';
    sortOrder?: 'asc'|'desc';
  }) {
    const { data } = await brapiApi.get('/api/v2/inflation', {
      params: {
        country: params?.country || 'brazil',
        historical: params?.historical,
        start: params?.start,
        end: params?.end,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      },
    });
    return data;
  },

  // 7. Taxa Selic / Prime Rate
  async getPrimeRate(params?: {
    country?: string;
    historical?: boolean;
    start?: string;
    end?: string;
    sortBy?: 'date';
    sortOrder?: 'asc'|'desc';
  }) {
    const { data } = await brapiApi.get('/api/v2/prime-rate', {
      params: {
        country: params?.country || 'brazil',
        historical: params?.historical,
        start: params?.start,
        end: params?.end,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      },
    });
    return data;
  },

  // 8. Cotação com dados detalhados (módulos financeiros)
  async getDetailedQuote(ticker: string) {
    const modules = [
      'balanceSheetHistory',
      'balanceSheetHistoryQuarterly',
      'incomeStatementHistory',
      'incomeStatementHistoryQuarterly',
      'summaryProfile',
      'financialData',
      'defaultKeyStatistics',
    ].join(',');
    const { data } = await brapiApi.get(`/api/quote/${ticker}`, {
      params: {
        fundamental: true,
        dividends: true,
        modules,
        range: '1y',
        interval: '1d',
      },
    });
    return data.results?.[0] || null;
  },

  // 9. Ibovespa
  async getIbovespa() {
    const { data } = await brapiApi.get('/api/quote/^BVSP', {
      params: { range: '1d', interval: '1d' },
    });
    return data.results?.[0] || null;
  },

  // 10. Busca rápida
  async search(query: string) {
    const { data } = await brapiApi.get('/api/quote/list', {
      params: { search: query, limit: 20 },
    });
    return data.stocks || [];
  },

  // 11. Múltiplas cotações de uma vez
  async getMultipleQuotes(tickers: string[]) {
    const { data } = await brapiApi.get(`/api/quote/${tickers.join(',')}`, {
      params: { fundamental: false },
    });
    return data.results || [];
  },
};
