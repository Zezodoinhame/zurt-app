export interface BrapiQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  marketCap: number;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekRange: string;
  regularMarketDayRange: string;
  logourl: string;
  usedInterval: string;
  usedRange: string;
  historicalDataPrice?: HistoricalPrice[];
  dividendsData?: DividendsData;
  priceEarnings?: number;
  earningsPerShare?: number;
  summaryProfile?: SummaryProfile;
  financialData?: FinancialData;
  balanceSheetHistory?: BalanceSheet[];
  incomeStatementHistory?: any[];
  cashflowHistory?: any[];
  defaultKeyStatistics?: any;
}

export interface HistoricalPrice {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export interface DividendsData {
  cashDividends: CashDividend[];
  stockDividends: StockDividend[];
  subscriptions: any[];
}

export interface CashDividend {
  assetIssued: string;
  paymentDate: string;
  rate: number;
  relatedTo: string;
  label: string;
  lastDatePrior: string;
}

export interface StockDividend {
  assetIssued: string;
  factor: number;
  completeFactor: string;
  label: string;
  lastDatePrior: string;
}

export interface SummaryProfile {
  symbol: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  website: string;
  industry: string;
  sector: string;
  longBusinessSummary: string;
  fullTimeEmployees: number;
}

export interface FinancialData {
  symbol: string;
  currentPrice: number;
  ebitda: number;
  currentRatio: number;
  debtToEquity: number;
  returnOnAssets: number;
  returnOnEquity: number;
  earningsGrowth: number;
  revenueGrowth: number;
  grossMargins: number;
  ebitdaMargins: number;
  operatingMargins: number;
  profitMargins: number;
  totalCash: number;
  totalDebt: number;
  totalRevenue: number;
  grossProfits: number;
  freeCashflow: number;
}

export interface BalanceSheet {
  symbol: string;
  type: string;
  endDate: string;
  totalAssets: number;
  totalLiab: number;
  totalStockholderEquity: number;
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  cash: number;
}

export interface BrapiCrypto {
  coin: string;
  coinName: string;
  currency: string;
  currencyRateFromUSD: number;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  marketCap: number;
}

export interface BrapiCurrency {
  fromCurrency: string;
  toCurrency: string;
  name: string;
  bidPrice: number;
  askPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  updatedAtDate: string;
}

export interface InflationEntry {
  date: string;
  value: string;
  epochDate: number;
}

export interface PrimeRateEntry {
  date: string;
  value: string;
  epochDate: number;
}
