export interface BrapiQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketDayRange: string;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  marketCap: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  averageDailyVolume3Month: number;
  averageDailyVolume10Day: number;
  fiftyTwoWeekHighChange: number;
  fiftyTwoWeekHighChangePercent: number;
  fiftyTwoWeekRange: string;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  twoHundredDayAverage: number;
  twoHundredDayAverageChange: number;
  twoHundredDayAverageChangePercent: number;
  historicalDataPrice?: HistoricalPrice[];
  dividendsData?: DividendsData;
  summaryProfile?: SummaryProfile;
  financialData?: FinancialData;
  balanceSheetHistory?: BalanceSheetStatement[];
  defaultKeyStatistics?: KeyStatistics;
  priceEarnings?: number;
  earningsPerShare?: number;
  logourl?: string;
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
  stockDividends: any[];
  subscriptions: any[];
}

export interface CashDividend {
  assetIssued: string;
  paymentDate: string;
  rate: number;
  relatedTo: string;
  approvedOn: string;
  isinCode: string;
  label: string;
  lastDatePrior: string;
}

export interface SummaryProfile {
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
  currentPrice: number;
  targetHighPrice: number;
  targetLowPrice: number;
  targetMeanPrice: number;
  targetMedianPrice: number;
  recommendationMean: number;
  recommendationKey: string;
  numberOfAnalystOpinions: number;
  totalCash: number;
  totalCashPerShare: number;
  ebitda: number;
  totalDebt: number;
  quickRatio: number;
  currentRatio: number;
  totalRevenue: number;
  debtToEquity: number;
  revenuePerShare: number;
  returnOnAssets: number;
  returnOnEquity: number;
  grossProfits: number;
  freeCashflow: number;
  operatingCashflow: number;
  earningsGrowth: number;
  revenueGrowth: number;
  grossMargins: number;
  ebitdaMargins: number;
  operatingMargins: number;
  profitMargins: number;
  financialCurrency: string;
}

export interface BalanceSheetStatement {
  endDate: string;
  totalAssets: number;
  totalLiab: number;
  totalStockholderEquity: number;
  netReceivables: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  cash: number;
  shortTermInvestments: number;
  inventory: number;
}

export interface KeyStatistics {
  enterpriseValue: number;
  forwardPE: number;
  profitMargins: number;
  floatShares: number;
  sharesOutstanding: number;
  bookValue: number;
  priceToBook: number;
  earningsTrailingPE: number;
  trailingEps: number;
  forwardEps: number;
  pegRatio: number;
  enterpriseToRevenue: number;
  enterpriseToEbitda: number;
  '52WeekChange': number;
  beta: number;
  lastDividendValue: number;
  lastDividendDate: string;
}

export interface BrapiCrypto {
  coin: string;
  coinName: string;
  currency: string;
  currencyRateFromUSD: number;
  regularMarketChange: number;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  marketCap: number;
  coinImageUrl: string;
}

export interface BrapiCurrency {
  fromCurrency: string;
  toCurrency: string;
  name: string;
  bidPrice: number;
  askPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketTime: string;
  currencyRateFromUSD: number;
}

export interface InflationEntry {
  date: string;
  value: number;
  epochDate: number;
}

export interface PrimeRateEntry {
  date: string;
  value: number;
  epochDate: number;
}

export interface StockListItem {
  stock: string;
  name: string;
  close: number;
  change: number;
  volume: number;
  market_cap: number;
  logo: string;
  sector: string;
  type: string;
}
