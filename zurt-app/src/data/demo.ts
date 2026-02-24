// =============================================================================
// ZURT Wealth Intelligence - Demo Data
// =============================================================================

import type {
  Asset,
  AssetClass,
  Institution,
  InstitutionId,
  ConnectionStatus,
  CreditCard,
  CardBrand,
  Transaction,
  TransactionCategory,
  Notification,
  NotificationType,
  User,
  Insight,
  MonthlyData,
  Allocation,
  CategorySpending,
  PortfolioSummary,
  Goal,
  TargetAllocation,
  RebalanceResult,
  TaxSummary,
  RiskMetrics,
  Badge,
  SmartAlert,
  ConsultantClient,
  ClientPortfolio,
  WatchlistItem,
  NewsArticle,
  NewsCategory,
  DividendMonth,
  DividendEvent,
  AssetComparisonData,
  MonthlyBudget,
  BudgetCategory,
  CashFlowMonth,
  SpendingInsightsData,
  CategoryTrend,
  Bill,
  CorrelationMatrix,
  BacktestResult,
  BacktestPeriodReturn,
  ScenarioPreset,
  PriceAlert,
  RecurringInvestment,
  NetWorthSummary,
  NetWorthDataPoint,
  NetWorthMilestone,
  Debt,
  PayoffComparison,
  RetirementParams,
  RetirementResult,
  MonteCarloResult,
  MonteCarloPercentile,
  Lesson,
  GlossaryTerm,
  LearnProgress,
  CryptoPortfolio,
  CryptoHolding,
  Subscription,
  RealEstateParams,
  RealEstateResult,
  SavingsChallenge,
  FIREParams,
  FIREResult,
  DiaryEntry,
  CompoundParams,
  EmergencyFundData,
  FinancialEvent,
} from '../types';

// =============================================================================
// User
// =============================================================================

export const demoUser: User = {
  id: '1',
  name: 'Diego Oliveira',
  email: 'diego@zurt.io',
  initials: 'DO',
  biometricEnabled: true,
  hideValuesOnOpen: false,
  pushEnabled: true,
  zurtTokens: 15000,
  revenueShareReceived: 2340.50,
  nextDistribution: '2026-03-01',
};

// =============================================================================
// Portfolio Summary
// =============================================================================

// Generate weekly history points from ~420 days ago until today
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function generateDemoHistory(): MonthlyData[] {
  const points: MonthlyData[] = [];
  const now = new Date();
  const startValue = 420000;
  const endValue = 847350;
  const totalDays = 420;
  const intervalDays = 7; // weekly points
  const totalPoints = Math.floor(totalDays / intervalDays) + 1;

  for (let i = 0; i < totalPoints; i++) {
    const daysAgo = totalDays - i * intervalDays;
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const progress = i / (totalPoints - 1);
    // Smooth growth with slight random variation (seeded by index for determinism)
    const noise = Math.sin(i * 1.7) * 0.015 + Math.sin(i * 3.1) * 0.008;
    const value = Math.round(startValue + (endValue - startValue) * (progress + noise * progress));
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    points.push({
      month: MONTH_LABELS[d.getMonth()],
      date: `${d.getFullYear()}-${mm}-${dd}`,
      value,
    });
  }

  // Ensure last point is today with exact final value
  const last = points[points.length - 1];
  const todayMM = String(now.getMonth() + 1).padStart(2, '0');
  const todayDD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${todayMM}-${todayDD}`;
  if (last.date !== todayStr) {
    points.push({ month: MONTH_LABELS[now.getMonth()], date: todayStr, value: endValue });
  } else {
    last.value = endValue;
  }

  return points;
}

export const portfolioSummary: PortfolioSummary = {
  totalValue: 847350,
  investedValue: 720000,
  profit: 127350,
  variation1m: 2.34,
  variation12m: 18.7,
  history: generateDemoHistory(),
};

// =============================================================================
// Institutions
// =============================================================================

export const institutions: Institution[] = [
  {
    id: 'xp',
    name: 'XP Investimentos',
    color: '#1A1A1A',
    secondaryColor: '#FFD700',
    assetCount: 8,
    totalValue: 312500,
    status: 'connected',
  },
  {
    id: 'btg',
    name: 'BTG Pactual',
    color: '#0D1B2A',
    secondaryColor: '#C9A96E',
    assetCount: 5,
    totalValue: 245000,
    status: 'connected',
  },
  {
    id: 'nubank',
    name: 'Nubank',
    color: '#8A05BE',
    assetCount: 4,
    totalValue: 128350,
    status: 'connected',
  },
  {
    id: 'inter',
    name: 'Inter',
    color: '#FF6600',
    assetCount: 3,
    totalValue: 89500,
    status: 'syncing',
  },
  {
    id: 'binance',
    name: 'Binance',
    color: '#F3BA2F',
    assetCount: 6,
    totalValue: 72000,
    status: 'connected',
  },
];

// =============================================================================
// Helper: generate price history
// =============================================================================

function generatePriceHistory(
  start: number,
  end: number,
  points: number,
  volatility: number,
  trending: 'up' | 'down' | 'flat',
): number[] {
  const history: number[] = [];
  const step = (end - start) / (points - 1);

  for (let i = 0; i < points; i++) {
    const base = start + step * i;
    const noise =
      (Math.sin(i * 2.7 + start) * volatility +
        Math.cos(i * 1.3 + end) * volatility * 0.5) *
      base;
    let value = base + noise;
    if (trending === 'up') {
      value = Math.max(value, start * 0.95);
    } else if (trending === 'down') {
      value = Math.min(value, start * 1.05);
    }
    history.push(parseFloat(value.toFixed(2)));
  }

  // Ensure last point matches the target end value
  history[points - 1] = end;
  return history;
}

// =============================================================================
// Assets
// =============================================================================

export const assets: Asset[] = [
  // ---------------------------------------------------------------------------
  // Renda Fixa (fixedIncome)
  // ---------------------------------------------------------------------------
  {
    id: 'a1',
    name: 'Tesouro Selic 2029',
    ticker: 'SELIC2029',
    class: 'fixedIncome',
    institution: 'xp',
    quantity: 150,
    averagePrice: 14200,
    currentPrice: 14850,
    investedValue: 213000,
    currentValue: 222750,
    variation: ((222750 - 213000) / 213000) * 100,
    priceHistory: generatePriceHistory(14200, 14850, 30, 0.002, 'up'),
  },
  {
    id: 'a2',
    name: 'CDB Inter 120% CDI',
    ticker: 'CDB-INTER',
    class: 'fixedIncome',
    institution: 'inter',
    quantity: 1,
    averagePrice: 50000,
    currentPrice: 54200,
    investedValue: 50000,
    currentValue: 54200,
    variation: ((54200 - 50000) / 50000) * 100,
    priceHistory: generatePriceHistory(50000, 54200, 30, 0.001, 'up'),
  },
  {
    id: 'a3',
    name: 'CDB BTG 110% CDI',
    ticker: 'CDB-BTG',
    class: 'fixedIncome',
    institution: 'btg',
    quantity: 1,
    averagePrice: 80000,
    currentPrice: 85600,
    investedValue: 80000,
    currentValue: 85600,
    variation: ((85600 - 80000) / 80000) * 100,
    priceHistory: generatePriceHistory(80000, 85600, 30, 0.001, 'up'),
  },
  {
    id: 'a4',
    name: 'LCI Nubank 95% CDI',
    ticker: 'LCI-NU',
    class: 'fixedIncome',
    institution: 'nubank',
    quantity: 1,
    averagePrice: 30000,
    currentPrice: 31350,
    investedValue: 30000,
    currentValue: 31350,
    variation: ((31350 - 30000) / 30000) * 100,
    priceHistory: generatePriceHistory(30000, 31350, 30, 0.001, 'up'),
  },
  {
    id: 'a5',
    name: 'Debenture VALE IPCA+6.5%',
    ticker: 'DEB-VALE',
    class: 'fixedIncome',
    institution: 'xp',
    quantity: 100,
    averagePrice: 1020,
    currentPrice: 1055,
    investedValue: 102000,
    currentValue: 105500,
    variation: ((105500 - 102000) / 102000) * 100,
    priceHistory: generatePriceHistory(1020, 1055, 30, 0.003, 'up'),
  },
  {
    id: 'a6',
    name: 'CRA Raizen IPCA+7.2%',
    ticker: 'CRA-RAIZ',
    class: 'fixedIncome',
    institution: 'btg',
    quantity: 50,
    averagePrice: 1000,
    currentPrice: 1048,
    investedValue: 50000,
    currentValue: 52400,
    variation: ((52400 - 50000) / 50000) * 100,
    priceHistory: generatePriceHistory(1000, 1048, 30, 0.002, 'up'),
  },

  // ---------------------------------------------------------------------------
  // Acoes (stocks)
  // ---------------------------------------------------------------------------
  {
    id: 'a7',
    name: 'Petrobras PN',
    ticker: 'PETR4',
    class: 'stocks',
    institution: 'xp',
    quantity: 500,
    averagePrice: 28.50,
    currentPrice: 38.72,
    investedValue: 14250,
    currentValue: 19360,
    variation: ((19360 - 14250) / 14250) * 100,
    priceHistory: generatePriceHistory(28.50, 38.72, 30, 0.02, 'up'),
  },
  {
    id: 'a8',
    name: 'Vale ON',
    ticker: 'VALE3',
    class: 'stocks',
    institution: 'xp',
    quantity: 300,
    averagePrice: 62.00,
    currentPrice: 58.45,
    investedValue: 18600,
    currentValue: 17535,
    variation: ((17535 - 18600) / 18600) * 100,
    priceHistory: generatePriceHistory(62.00, 58.45, 30, 0.025, 'down'),
  },
  {
    id: 'a9',
    name: 'Itau Unibanco PN',
    ticker: 'ITUB4',
    class: 'stocks',
    institution: 'btg',
    quantity: 400,
    averagePrice: 25.80,
    currentPrice: 32.15,
    investedValue: 10320,
    currentValue: 12860,
    variation: ((12860 - 10320) / 10320) * 100,
    priceHistory: generatePriceHistory(25.80, 32.15, 30, 0.018, 'up'),
  },
  {
    id: 'a10',
    name: 'WEG ON',
    ticker: 'WEGE3',
    class: 'stocks',
    institution: 'btg',
    quantity: 200,
    averagePrice: 35.00,
    currentPrice: 42.80,
    investedValue: 7000,
    currentValue: 8560,
    variation: ((8560 - 7000) / 7000) * 100,
    priceHistory: generatePriceHistory(35.00, 42.80, 30, 0.015, 'up'),
  },
  {
    id: 'a11',
    name: 'Banco do Brasil ON',
    ticker: 'BBAS3',
    class: 'stocks',
    institution: 'nubank',
    quantity: 350,
    averagePrice: 42.00,
    currentPrice: 56.30,
    investedValue: 14700,
    currentValue: 19705,
    variation: ((19705 - 14700) / 14700) * 100,
    priceHistory: generatePriceHistory(42.00, 56.30, 30, 0.02, 'up'),
  },
  {
    id: 'a12',
    name: 'Magazine Luiza ON',
    ticker: 'MGLU3',
    class: 'stocks',
    institution: 'xp',
    quantity: 1000,
    averagePrice: 8.50,
    currentPrice: 5.20,
    investedValue: 8500,
    currentValue: 5200,
    variation: ((5200 - 8500) / 8500) * 100,
    priceHistory: generatePriceHistory(8.50, 5.20, 30, 0.04, 'down'),
  },
  {
    id: 'a13',
    name: 'Ambev ON',
    ticker: 'ABEV3',
    class: 'stocks',
    institution: 'nubank',
    quantity: 600,
    averagePrice: 12.50,
    currentPrice: 13.85,
    investedValue: 7500,
    currentValue: 8310,
    variation: ((8310 - 7500) / 7500) * 100,
    priceHistory: generatePriceHistory(12.50, 13.85, 30, 0.012, 'up'),
  },

  // ---------------------------------------------------------------------------
  // FIIs (fiis)
  // ---------------------------------------------------------------------------
  {
    id: 'a14',
    name: 'CGHG Logistica',
    ticker: 'HGLG11',
    class: 'fiis',
    institution: 'xp',
    quantity: 100,
    averagePrice: 158.00,
    currentPrice: 165.40,
    investedValue: 15800,
    currentValue: 16540,
    variation: ((16540 - 15800) / 15800) * 100,
    priceHistory: generatePriceHistory(158.00, 165.40, 30, 0.008, 'up'),
  },
  {
    id: 'a15',
    name: 'XP Malls',
    ticker: 'XPML11',
    class: 'fiis',
    institution: 'xp',
    quantity: 80,
    averagePrice: 95.00,
    currentPrice: 102.30,
    investedValue: 7600,
    currentValue: 8184,
    variation: ((8184 - 7600) / 7600) * 100,
    priceHistory: generatePriceHistory(95.00, 102.30, 30, 0.01, 'up'),
  },
  {
    id: 'a16',
    name: 'Kinea Renda Imobiliaria',
    ticker: 'KNRI11',
    class: 'fiis',
    institution: 'btg',
    quantity: 60,
    averagePrice: 130.00,
    currentPrice: 128.50,
    investedValue: 7800,
    currentValue: 7710,
    variation: ((7710 - 7800) / 7800) * 100,
    priceHistory: generatePriceHistory(130.00, 128.50, 30, 0.007, 'down'),
  },
  {
    id: 'a17',
    name: 'Maxi Renda',
    ticker: 'MXRF11',
    class: 'fiis',
    institution: 'nubank',
    quantity: 500,
    averagePrice: 10.20,
    currentPrice: 10.58,
    investedValue: 5100,
    currentValue: 5290,
    variation: ((5290 - 5100) / 5100) * 100,
    priceHistory: generatePriceHistory(10.20, 10.58, 30, 0.006, 'up'),
  },

  // ---------------------------------------------------------------------------
  // Crypto (crypto)
  // ---------------------------------------------------------------------------
  {
    id: 'a18',
    name: 'Bitcoin',
    ticker: 'BTC',
    class: 'crypto',
    institution: 'binance',
    quantity: 0.15,
    averagePrice: 280000,
    currentPrice: 320000,
    investedValue: 42000,
    currentValue: 48000,
    variation: ((48000 - 42000) / 42000) * 100,
    priceHistory: generatePriceHistory(280000, 320000, 30, 0.035, 'up'),
  },
  {
    id: 'a19',
    name: 'Ethereum',
    ticker: 'ETH',
    class: 'crypto',
    institution: 'binance',
    quantity: 2.5,
    averagePrice: 12000,
    currentPrice: 11200,
    investedValue: 30000,
    currentValue: 28000,
    variation: ((28000 - 30000) / 30000) * 100,
    priceHistory: generatePriceHistory(12000, 11200, 30, 0.04, 'down'),
  },
  {
    id: 'a20',
    name: 'Solana',
    ticker: 'SOL',
    class: 'crypto',
    institution: 'binance',
    quantity: 50,
    averagePrice: 480,
    currentPrice: 560,
    investedValue: 24000,
    currentValue: 28000,
    variation: ((28000 - 24000) / 24000) * 100,
    priceHistory: generatePriceHistory(480, 560, 30, 0.045, 'up'),
  },

  // ---------------------------------------------------------------------------
  // Internacional (international)
  // ---------------------------------------------------------------------------
  {
    id: 'a21',
    name: 'Vanguard S&P 500 ETF',
    ticker: 'VOO',
    class: 'international',
    institution: 'inter',
    quantity: 10,
    averagePrice: 2100,
    currentPrice: 2280,
    investedValue: 21000,
    currentValue: 22800,
    variation: ((22800 - 21000) / 21000) * 100,
    priceHistory: generatePriceHistory(2100, 2280, 30, 0.012, 'up'),
  },
  {
    id: 'a22',
    name: 'Invesco QQQ Trust',
    ticker: 'QQQ',
    class: 'international',
    institution: 'inter',
    quantity: 5,
    averagePrice: 2500,
    currentPrice: 2500,
    investedValue: 12500,
    currentValue: 12500,
    variation: 0,
    priceHistory: generatePriceHistory(2500, 2500, 30, 0.015, 'flat'),
  },
  {
    id: 'a23',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    class: 'international',
    institution: 'xp',
    quantity: 15,
    averagePrice: 850,
    currentPrice: 920,
    investedValue: 12750,
    currentValue: 13800,
    variation: ((13800 - 12750) / 12750) * 100,
    priceHistory: generatePriceHistory(850, 920, 30, 0.015, 'up'),
  },

  // ---------------------------------------------------------------------------
  // Previdencia (pension)
  // ---------------------------------------------------------------------------
  {
    id: 'a24',
    name: 'VGBL Bradesco Multi FIA',
    ticker: 'VGBL-BRAD',
    class: 'pension',
    institution: 'btg',
    quantity: 1,
    averagePrice: 45000,
    currentPrice: 49870,
    investedValue: 45000,
    currentValue: 49870,
    variation: ((49870 - 45000) / 45000) * 100,
    priceHistory: generatePriceHistory(45000, 49870, 30, 0.005, 'up'),
  },
];

// =============================================================================
// Allocations
// =============================================================================

export const allocations: Allocation[] = [
  {
    class: 'fixedIncome',
    label: 'Renda Fixa',
    value: 551800,
    percentage: 65.1,
    color: '#3A86FF',
  },
  {
    class: 'stocks',
    label: 'Ações',
    value: 91530,
    percentage: 10.8,
    color: '#00D4AA',
  },
  {
    class: 'fiis',
    label: 'FIIs',
    value: 37724,
    percentage: 4.5,
    color: '#FFBE0B',
  },
  {
    class: 'crypto',
    label: 'Cripto',
    value: 104000,
    percentage: 12.3,
    color: '#F3BA2F',
  },
  {
    class: 'international',
    label: 'Internacional',
    value: 49100,
    percentage: 5.8,
    color: '#A855F7',
  },
  {
    class: 'pension',
    label: 'Previdência',
    value: 49870,
    percentage: 5.9,
    color: '#F472B6',
  },
];

// =============================================================================
// Credit Cards
// =============================================================================

export const creditCards: CreditCard[] = [
  // ---------------------------------------------------------------------------
  // Nubank Ultravioleta
  // ---------------------------------------------------------------------------
  {
    id: 'card-1',
    name: 'Nubank Ultravioleta',
    lastFour: '4829',
    brand: 'mastercard',
    limit: 35000,
    used: 12450,
    dueDate: '2026-03-10',
    closingDate: '2026-03-03',
    color: '#1A0533',
    secondaryColor: '#8A05BE',
    currentInvoice: 12450,
    nextInvoice: 3200,
    transactions: [
      {
        id: 'nu-t1',
        date: '2026-02-18T12:30:00',
        description: 'iFood - Restaurante Sabor da Casa',
        category: 'food',
        amount: 78.90,
      },
      {
        id: 'nu-t2',
        date: '2026-02-17T19:45:00',
        description: 'Uber Trip',
        category: 'transport',
        amount: 34.50,
      },
      {
        id: 'nu-t3',
        date: '2026-02-17T08:00:00',
        description: 'Netflix',
        category: 'subscriptions',
        amount: 55.90,
      },
      {
        id: 'nu-t4',
        date: '2026-02-16T14:22:00',
        description: 'Amazon.com.br',
        category: 'shopping',
        amount: 459.90,
        installment: '2/3',
      },
      {
        id: 'nu-t5',
        date: '2026-02-16T10:15:00',
        description: 'Shell - Posto Ipiranga',
        category: 'fuel',
        amount: 320.00,
      },
      {
        id: 'nu-t6',
        date: '2026-02-15T20:10:00',
        description: 'Rappi - Burger King',
        category: 'food',
        amount: 62.40,
      },
      {
        id: 'nu-t7',
        date: '2026-02-15T09:30:00',
        description: 'Spotify Premium Familia',
        category: 'subscriptions',
        amount: 34.90,
      },
      {
        id: 'nu-t8',
        date: '2026-02-14T16:45:00',
        description: 'Mercado Livre - Eletronica',
        category: 'tech',
        amount: 1299.00,
        installment: '4/10',
      },
      {
        id: 'nu-t9',
        date: '2026-02-14T11:00:00',
        description: 'Pao de Acucar',
        category: 'food',
        amount: 487.35,
      },
      {
        id: 'nu-t10',
        date: '2026-02-13T17:20:00',
        description: 'Drogaria Sao Paulo',
        category: 'health',
        amount: 189.50,
      },
      {
        id: 'nu-t11',
        date: '2026-02-13T08:50:00',
        description: 'Gympass',
        category: 'health',
        amount: 149.90,
      },
      {
        id: 'nu-t12',
        date: '2026-02-12T21:30:00',
        description: 'iFood - Sushi Kenzo',
        category: 'food',
        amount: 134.80,
      },
      {
        id: 'nu-t13',
        date: '2026-02-11T14:10:00',
        description: '99 - Corrida',
        category: 'transport',
        amount: 28.70,
      },
      {
        id: 'nu-t14',
        date: '2026-02-10T18:00:00',
        description: 'Renner',
        category: 'shopping',
        amount: 385.00,
        installment: '1/3',
      },
      {
        id: 'nu-t15',
        date: '2026-02-09T12:15:00',
        description: 'Padaria Real',
        category: 'food',
        amount: 45.60,
      },
      {
        id: 'nu-t16',
        date: '2026-02-08T09:00:00',
        description: 'Apple - iCloud 200GB',
        category: 'subscriptions',
        amount: 14.90,
      },
      {
        id: 'nu-t17',
        date: '2026-02-07T15:40:00',
        description: 'Shell - BR Mania',
        category: 'fuel',
        amount: 280.00,
      },
      {
        id: 'nu-t18',
        date: '2026-02-05T20:00:00',
        description: 'iFood - Pizzaria Braz',
        category: 'food',
        amount: 98.70,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Inter Black
  // ---------------------------------------------------------------------------
  {
    id: 'card-2',
    name: 'Inter Black',
    lastFour: '7712',
    brand: 'mastercard',
    limit: 20000,
    used: 8320,
    dueDate: '2026-03-15',
    closingDate: '2026-03-08',
    color: '#1A0A00',
    secondaryColor: '#FF6600',
    currentInvoice: 8320,
    nextInvoice: 1850,
    transactions: [
      {
        id: 'in-t1',
        date: '2026-02-18T10:00:00',
        description: 'Uber Eats - McDonalds',
        category: 'food',
        amount: 56.80,
      },
      {
        id: 'in-t2',
        date: '2026-02-17T14:30:00',
        description: 'Kabum - Periferico Gamer',
        category: 'tech',
        amount: 849.90,
        installment: '3/6',
      },
      {
        id: 'in-t3',
        date: '2026-02-16T09:20:00',
        description: 'Ipiranga - Combustível',
        category: 'fuel',
        amount: 350.00,
      },
      {
        id: 'in-t4',
        date: '2026-02-16T07:45:00',
        description: 'Starbucks - Shopping Iguatemi',
        category: 'food',
        amount: 38.50,
      },
      {
        id: 'in-t5',
        date: '2026-02-15T18:30:00',
        description: 'Zara Brasil',
        category: 'shopping',
        amount: 599.90,
        installment: '2/4',
      },
      {
        id: 'in-t6',
        date: '2026-02-14T20:00:00',
        description: 'Rappi - Outback Steakhouse',
        category: 'food',
        amount: 215.40,
      },
      {
        id: 'in-t7',
        date: '2026-02-14T11:15:00',
        description: 'Steam - Game Purchase',
        category: 'tech',
        amount: 199.90,
      },
      {
        id: 'in-t8',
        date: '2026-02-13T16:00:00',
        description: 'Carrefour Hiper',
        category: 'food',
        amount: 623.45,
      },
      {
        id: 'in-t9',
        date: '2026-02-12T08:30:00',
        description: 'Uber Trip',
        category: 'transport',
        amount: 42.30,
      },
      {
        id: 'in-t10',
        date: '2026-02-11T19:10:00',
        description: 'iFood - Habbibs',
        category: 'food',
        amount: 54.90,
      },
      {
        id: 'in-t11',
        date: '2026-02-10T15:45:00',
        description: 'Amazon Prime Video',
        category: 'subscriptions',
        amount: 19.90,
      },
      {
        id: 'in-t12',
        date: '2026-02-09T10:20:00',
        description: 'Drogasil',
        category: 'health',
        amount: 87.60,
      },
      {
        id: 'in-t13',
        date: '2026-02-08T13:00:00',
        description: 'Posto Texaco',
        category: 'fuel',
        amount: 290.00,
      },
      {
        id: 'in-t14',
        date: '2026-02-07T17:30:00',
        description: 'Centauro - Tenis Nike',
        category: 'shopping',
        amount: 699.90,
        installment: '1/5',
      },
      {
        id: 'in-t15',
        date: '2026-02-06T12:00:00',
        description: 'Madero Restaurante',
        category: 'food',
        amount: 178.50,
      },
      {
        id: 'in-t16',
        date: '2026-02-05T09:30:00',
        description: '99 - Corrida Express',
        category: 'transport',
        amount: 22.70,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // BTG+ Black
  // ---------------------------------------------------------------------------
  {
    id: 'card-3',
    name: 'BTG+ Black',
    lastFour: '3301',
    brand: 'visa',
    limit: 50000,
    used: 15780,
    dueDate: '2026-03-20',
    closingDate: '2026-03-13',
    color: '#0D1B2A',
    secondaryColor: '#C9A96E',
    currentInvoice: 15780,
    nextInvoice: 4500,
    transactions: [
      {
        id: 'btg-t1',
        date: '2026-02-18T09:00:00',
        description: 'Apple Store - AirPods Pro',
        category: 'tech',
        amount: 2099.00,
        installment: '1/6',
      },
      {
        id: 'btg-t2',
        date: '2026-02-17T20:15:00',
        description: 'Fasano Restaurante',
        category: 'food',
        amount: 890.00,
      },
      {
        id: 'btg-t3',
        date: '2026-02-17T10:00:00',
        description: 'Uber Black',
        category: 'transport',
        amount: 89.90,
      },
      {
        id: 'btg-t4',
        date: '2026-02-16T15:00:00',
        description: 'Vivara Joias',
        category: 'shopping',
        amount: 1850.00,
        installment: '3/8',
      },
      {
        id: 'btg-t5',
        date: '2026-02-15T14:30:00',
        description: 'Mercado Livre - Smart TV Samsung',
        category: 'tech',
        amount: 3499.00,
        installment: '5/12',
      },
      {
        id: 'btg-t6',
        date: '2026-02-15T08:00:00',
        description: 'Shell V-Power',
        category: 'fuel',
        amount: 380.00,
      },
      {
        id: 'btg-t7',
        date: '2026-02-14T19:00:00',
        description: 'D.O.M. Restaurante',
        category: 'food',
        amount: 1250.00,
      },
      {
        id: 'btg-t8',
        date: '2026-02-13T11:00:00',
        description: 'Leroy Merlin',
        category: 'shopping',
        amount: 1456.80,
        installment: '2/4',
      },
      {
        id: 'btg-t9',
        date: '2026-02-12T16:20:00',
        description: 'ChatGPT Plus',
        category: 'subscriptions',
        amount: 110.00,
      },
      {
        id: 'btg-t10',
        date: '2026-02-12T09:45:00',
        description: 'Hospital Albert Einstein - Consulta',
        category: 'health',
        amount: 850.00,
      },
      {
        id: 'btg-t11',
        date: '2026-02-11T18:30:00',
        description: 'iFood - Coco Bambu',
        category: 'food',
        amount: 267.90,
      },
      {
        id: 'btg-t12',
        date: '2026-02-10T14:00:00',
        description: 'Uber Trip',
        category: 'transport',
        amount: 55.60,
      },
      {
        id: 'btg-t13',
        date: '2026-02-09T20:00:00',
        description: 'Wine.com.br',
        category: 'food',
        amount: 389.00,
        installment: '1/2',
      },
      {
        id: 'btg-t14',
        date: '2026-02-08T10:30:00',
        description: 'Adobe Creative Cloud',
        category: 'subscriptions',
        amount: 290.00,
      },
      {
        id: 'btg-t15',
        date: '2026-02-07T13:15:00',
        description: 'Ipiranga - Gasolina',
        category: 'fuel',
        amount: 310.00,
      },
      {
        id: 'btg-t16',
        date: '2026-02-06T17:00:00',
        description: 'Fast Shop - Bose Headphones',
        category: 'tech',
        amount: 1790.00,
        installment: '2/6',
      },
      {
        id: 'btg-t17',
        date: '2026-02-05T12:30:00',
        description: 'Uber Black',
        category: 'transport',
        amount: 72.40,
      },
    ],
  },
];

// =============================================================================
// Category Spending
// =============================================================================

export const categorySpending: CategorySpending[] = [
  {
    category: 'food',
    label: 'Alimentação',
    icon: '\u{1F355}',
    total: 4850,
    percentage: 32,
    color: '#FF6B6B',
  },
  {
    category: 'transport',
    label: 'Transporte',
    icon: '\u{1F697}',
    total: 2100,
    percentage: 14,
    color: '#4ECDC4',
  },
  {
    category: 'subscriptions',
    label: 'Assinaturas',
    icon: '\u{1F4FA}',
    total: 890,
    percentage: 6,
    color: '#A855F7',
  },
  {
    category: 'shopping',
    label: 'Compras',
    icon: '\u{1F6CD}\u{FE0F}',
    total: 3200,
    percentage: 21,
    color: '#F472B6',
  },
  {
    category: 'fuel',
    label: 'Combustível',
    icon: '\u{26FD}',
    total: 1800,
    percentage: 12,
    color: '#FB923C',
  },
  {
    category: 'health',
    label: 'Saúde',
    icon: '\u{1F48A}',
    total: 650,
    percentage: 4,
    color: '#34D399',
  },
  {
    category: 'travel',
    label: 'Viagem',
    icon: '\u{2708}\u{FE0F}',
    total: 0,
    percentage: 0,
    color: '#60A5FA',
  },
  {
    category: 'tech',
    label: 'Tecnologia',
    icon: '\u{1F4BB}',
    total: 1560,
    percentage: 10,
    color: '#818CF8',
  },
];

// =============================================================================
// Notifications
// =============================================================================

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'distribution',
    title: 'Revenue Share ZURT',
    body: 'Você recebeu R$ 234,50 de revenue share referente a fevereiro.',
    date: '2026-02-18T10:30:00',
    read: false,
  },
  {
    id: 'n2',
    type: 'maturity',
    title: 'CDB vencendo em 5 dias',
    body: 'Seu CDB do Inter (120% CDI) vence em 20/02. Valor: R$ 54.200,00.',
    date: '2026-02-17T14:00:00',
    read: false,
  },
  {
    id: 'n3',
    type: 'invoice',
    title: 'Fatura Nubank Ultravioleta',
    body: 'Sua fatura de R$ 12.450,00 vence em 10/03. Pague via app para ganhar cashback.',
    date: '2026-02-17T09:00:00',
    read: false,
  },
  {
    id: 'n4',
    type: 'insight',
    title: 'PETR4 em alta de 35%',
    body: 'Petrobras PN acumula valorização de 35% desde sua compra. Considere realizar lucro parcial.',
    date: '2026-02-16T16:30:00',
    read: false,
  },
  {
    id: 'n5',
    type: 'system',
    title: 'Inter sincronizando',
    body: 'Estamos atualizando seus dados do Inter. Isso pode levar alguns minutos.',
    date: '2026-02-16T11:00:00',
    read: true,
  },
  {
    id: 'n6',
    type: 'distribution',
    title: 'Dividendo BBAS3',
    body: 'Você recebeu R$ 612,50 em dividendos do Banco do Brasil (350 ações x R$ 1,75).',
    date: '2026-02-16T08:00:00',
    read: true,
  },
  {
    id: 'n7',
    type: 'insight',
    title: 'MGLU3 em queda',
    body: 'Magazine Luiza caiu 38,8% desde sua compra. Avalie se faz sentido manter a posição.',
    date: '2026-02-15T15:45:00',
    read: false,
  },
  {
    id: 'n8',
    type: 'invoice',
    title: 'Fatura BTG+ Black',
    body: 'Sua fatura de R$ 15.780,00 fecha em 13/03. Vencimento: 20/03.',
    date: '2026-02-15T10:00:00',
    read: true,
  },
  {
    id: 'n9',
    type: 'maturity',
    title: 'Debenture VALE rendendo bem',
    body: 'Sua debenture da Vale rendeu 3,4% no periodo. Proximo pagamento de cupom em 15/03.',
    date: '2026-02-15T08:30:00',
    read: true,
  },
  {
    id: 'n10',
    type: 'system',
    title: 'Binance conectada com sucesso',
    body: 'Sua conta Binance foi reconectada. 6 ativos encontrados, totalizando R$ 72.000.',
    date: '2026-02-14T14:20:00',
    read: true,
  },
  {
    id: 'n11',
    type: 'distribution',
    title: 'Rendimento FII HGLG11',
    body: 'Você recebeu R$ 82,00 em rendimentos do HGLG11 (100 cotas x R$ 0,82).',
    date: '2026-02-14T09:00:00',
    read: true,
  },
  {
    id: 'n12',
    type: 'insight',
    title: 'ETH em queda de 6,7%',
    body: 'Ethereum recuou para R$ 11.200. Seu prejuizo atual e de R$ 2.000. Fique atento ao suporte.',
    date: '2026-02-13T17:00:00',
    read: false,
  },
  {
    id: 'n13',
    type: 'invoice',
    title: 'Fatura Inter Black',
    body: 'Sua fatura de R$ 8.320,00 vence em 15/03. Limite disponível: R$ 11.680,00.',
    date: '2026-02-13T09:30:00',
    read: true,
  },
  {
    id: 'n14',
    type: 'system',
    title: 'Atualização de segurança',
    body: 'Sua autenticação biométrica foi verificada com sucesso. Conta protegida.',
    date: '2026-02-12T16:00:00',
    read: true,
  },
  {
    id: 'n15',
    type: 'distribution',
    title: 'Rendimento FII MXRF11',
    body: 'Você recebeu R$ 55,00 em rendimentos do MXRF11 (500 cotas x R$ 0,11).',
    date: '2026-02-12T09:00:00',
    read: true,
  },
  {
    id: 'n16',
    type: 'insight',
    title: 'Alocacao desbalanceada',
    body: 'Sua alocação em renda fixa (65%) esta acima do recomendado (57%). Considere diversificar.',
    date: '2026-02-12T07:00:00',
    read: false,
  },
];

// =============================================================================
// Insights
// =============================================================================

export const insights: Insight[] = [
  {
    id: 'i1',
    icon: '\u{26A0}\u{FE0F}',
    text: 'Seu CDB do Inter vence em 5 dias \u{2014} R$ 54.200',
    action: 'Ver detalhes',
    type: 'warning',
  },
  {
    id: 'i2',
    icon: '\u{1F4CA}',
    text: 'Sua alocação em renda fixa esta 8% acima do recomendado',
    action: 'Rebalancear',
    type: 'info',
  },
  {
    id: 'i3',
    icon: '\u{1F4A1}',
    text: 'PETR4 subiu 35% \u{2014} considere realizar lucro parcial',
    action: 'Ver ativo',
    type: 'opportunity',
  },
];

// =============================================================================
// Goals
// =============================================================================

export const demoGoals: Goal[] = [
  {
    id: 'g1',
    name: 'Reserva de emergência',
    target_amount: 50000,
    current_amount: 30000,
    deadline: '2026-12-31',
    category: 'emergency',
    icon: '\u{1F6E1}\u{FE0F}',
    color: '#FF6B6B',
    monthly_contribution: 2000,
    created_at: '2025-06-01',
  },
  {
    id: 'g2',
    name: 'Viagem Europa',
    target_amount: 20000,
    current_amount: 5000,
    deadline: '2027-06-15',
    category: 'trip',
    icon: '\u{2708}\u{FE0F}',
    color: '#60A5FA',
    monthly_contribution: 800,
    created_at: '2025-09-10',
  },
  {
    id: 'g3',
    name: 'Aposentadoria',
    target_amount: 1000000,
    current_amount: 80000,
    deadline: '2050-01-01',
    category: 'retirement',
    icon: '\u{1F3E0}',
    color: '#A855F7',
    monthly_contribution: 3000,
    created_at: '2024-01-15',
  },
];

// =============================================================================
// Benchmarks — demo values for performance comparison
// =============================================================================

export const demoBenchmarks = {
  '1M': { cdi: 1.0, ipca: 0.5, ibov: 1.5 },
  '3M': { cdi: 3.1, ipca: 1.6, ibov: 4.2 },
  '6M': { cdi: 6.3, ipca: 3.1, ibov: 8.5 },
  '12M': { cdi: 12.8, ipca: 6.2, ibov: 18.0 },
} as const;

// =============================================================================
// Target Allocations (Rebalance)
// =============================================================================

export const demoTargetAllocations: TargetAllocation[] = [
  { class: 'fixedIncome', label: 'Renda Fixa', currentPct: 65.1, targetPct: 55, color: '#3A86FF' },
  { class: 'stocks', label: 'Ações', currentPct: 10.8, targetPct: 15, color: '#00D4AA' },
  { class: 'fiis', label: 'FIIs', currentPct: 4.5, targetPct: 8, color: '#FFBE0B' },
  { class: 'crypto', label: 'Cripto', currentPct: 12.3, targetPct: 10, color: '#F3BA2F' },
  { class: 'international', label: 'Internacional', currentPct: 5.8, targetPct: 7, color: '#A855F7' },
  { class: 'pension', label: 'Previdência', currentPct: 5.9, targetPct: 5, color: '#F472B6' },
];

export const demoRebalanceResult: RebalanceResult = {
  trades: [
    { class: 'fixedIncome', label: 'Renda Fixa', action: 'SELL', amount: 85600, color: '#3A86FF' },
    { class: 'stocks', label: 'Ações', action: 'BUY', amount: 35573, color: '#00D4AA' },
    { class: 'fiis', label: 'FIIs', action: 'BUY', amount: 29664, color: '#FFBE0B' },
    { class: 'crypto', label: 'Cripto', action: 'SELL', amount: 19470, color: '#F3BA2F' },
    { class: 'international', label: 'Internacional', action: 'BUY', amount: 10174, color: '#A855F7' },
    { class: 'pension', label: 'Previdência', action: 'SELL', amount: 7603, color: '#F472B6' },
  ],
  totalBuy: 75411,
  totalSell: 112673,
  estimatedTax: 3450,
  netCashRequired: -37262,
};

// =============================================================================
// Tax Summary
// =============================================================================

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const demoTaxSummary: TaxSummary = {
  year: 2026,
  estimatedIR: 12480,
  totalGains: 127350,
  totalLosses: 8300,
  netGains: 119050,
  exemptAmount: 82400,
  taxableAmount: 36650,
  darfs: MONTH_NAMES_SHORT.map((label, i) => {
    const month = i + 1;
    if (month > 2) {
      return { month, label, amount: 0, status: 'exempt' as const, dueDate: `2026-${String(month + 1).padStart(2, '0')}-28` };
    }
    const amounts = [1240, 980];
    const statuses: Array<'paid' | 'pending'> = ['paid', 'pending'];
    return {
      month,
      label,
      amount: amounts[i],
      status: statuses[i],
      dueDate: `2026-${String(month + 1).padStart(2, '0')}-28`,
    };
  }),
};

// =============================================================================
// Risk Metrics
// =============================================================================

export const demoRiskMetrics: RiskMetrics = {
  healthScore: 72,
  sharpe: 1.35,
  beta: 0.82,
  maxDrawdown: -8.5,
  volatility: 12.4,
  diversification: 78,
  concentration: 35,
  historicalScores: [65, 68, 64, 70, 72, 69, 73, 71, 74, 72, 70, 72],
};

// =============================================================================
// Badges
// =============================================================================

export const demoBadges: Badge[] = [
  // Milestones
  { id: 'b1', emoji: '\uD83D\uDE80', title: 'Primeiro Investimento', description: 'Fez seu primeiro aporte', category: 'milestones', status: 'earned', earnedAt: '2024-01-20' },
  { id: 'b2', emoji: '\uD83D\uDCB0', title: 'R$ 100k', description: 'Patrimônio ultrapassou R$ 100.000', category: 'milestones', status: 'earned', earnedAt: '2024-06-15' },
  { id: 'b3', emoji: '\uD83D\uDC8E', title: 'R$ 500k', description: 'Patrimônio ultrapassou R$ 500.000', category: 'milestones', status: 'earned', earnedAt: '2025-03-10' },
  // Consistency
  { id: 'b4', emoji: '\uD83D\uDD25', title: 'Sequência 3 meses', description: 'Aportou 3 meses seguidos', category: 'consistency', status: 'earned', earnedAt: '2024-04-01' },
  { id: 'b5', emoji: '\u26A1', title: 'Sequência 6 meses', description: 'Aportou 6 meses seguidos', category: 'consistency', status: 'inProgress', progress: 67 },
  { id: 'b6', emoji: '\uD83C\uDFC6', title: 'Sequência 12 meses', description: 'Aportou 12 meses seguidos', category: 'consistency', status: 'locked' },
  // Education
  { id: 'b7', emoji: '\uD83D\uDCDA', title: 'Estudante', description: 'Completou 3 módulos educativos', category: 'education', status: 'earned', earnedAt: '2024-08-20' },
  { id: 'b8', emoji: '\uD83C\uDF93', title: 'Mestre', description: 'Completou todos os módulos', category: 'education', status: 'inProgress', progress: 45 },
  { id: 'b9', emoji: '\uD83E\uDDD1\u200D\uD83C\uDFEB', title: 'Mentor', description: 'Convidou 5 pessoas', category: 'education', status: 'locked' },
  // Tax Efficiency
  { id: 'b10', emoji: '\uD83E\uDDEE', title: 'DARF em Dia', description: 'Pagou todas as DARFs no prazo', category: 'tax', status: 'earned', earnedAt: '2025-01-30' },
  { id: 'b11', emoji: '\uD83D\uDCCA', title: 'Otimizador', description: 'Utilizou prejuízos para compensação', category: 'tax', status: 'inProgress', progress: 80 },
  { id: 'b12', emoji: '\uD83E\uDD47', title: 'Eficiência Máxima', description: 'Reduziu IR em 30% no ano', category: 'tax', status: 'locked' },
];

// =============================================================================
// Smart Alerts
// =============================================================================

export const demoSmartAlerts: SmartAlert[] = [
  {
    id: 'sa1',
    type: 'portfolio_drift',
    title: 'Alocação desbalanceada',
    body: 'Renda fixa está 10% acima da meta. Considere rebalancear.',
    date: '2026-02-23T08:00:00',
    read: false,
    data: { currentPct: 65, targetPct: 55, class: 'fixedIncome' },
  },
  {
    id: 'sa2',
    type: 'dividend_received',
    title: 'Dividendo BBAS3',
    body: 'Você recebeu R$ 612,50 em dividendos do Banco do Brasil.',
    date: '2026-02-22T09:00:00',
    read: false,
    data: { ticker: 'BBAS3', amount: 612.5, date: '2026-02-22' },
  },
  {
    id: 'sa3',
    type: 'goal_milestone',
    title: 'Meta 60% atingida!',
    body: 'Reserva de emergência alcançou R$ 30.000 de R$ 50.000.',
    date: '2026-02-21T10:00:00',
    read: false,
    data: { goalName: 'Reserva de emergência', progress: 60, current: 30000, target: 50000 },
  },
  {
    id: 'sa4',
    type: 'tax_deadline',
    title: 'DARF vence em 5 dias',
    body: 'DARF de fevereiro no valor de R$ 980,00 vence em 28/02.',
    date: '2026-02-23T07:00:00',
    read: false,
    data: { amount: 980, dueDate: '2026-02-28', month: 'Fev' },
  },
  {
    id: 'sa5',
    type: 'market_alert',
    title: 'PETR4 +5,2% hoje',
    body: 'Petrobras PN subiu 5,2% na sessão. Sua posição valorizou R$ 960.',
    date: '2026-02-22T17:30:00',
    read: true,
    data: { ticker: 'PETR4', change: 5.2, gainAmount: 960 },
  },
];

// =============================================================================
// Consultant Clients
// =============================================================================

export const demoConsultantClients: ConsultantClient[] = [
  {
    id: 'cc1',
    name: 'Ana Carolina Mendes',
    email: 'ana@email.com',
    initials: 'AM',
    netWorth: 1250000,
    lastSync: '2026-02-23T10:00:00',
    accountCount: 4,
    riskProfile: 'moderate',
  },
  {
    id: 'cc2',
    name: 'Roberto Silva Neto',
    email: 'roberto@email.com',
    initials: 'RS',
    netWorth: 3480000,
    lastSync: '2026-02-22T15:30:00',
    accountCount: 6,
    riskProfile: 'aggressive',
  },
  {
    id: 'cc3',
    name: 'Maria Fernanda Costa',
    email: 'maria.f@email.com',
    initials: 'MC',
    netWorth: 520000,
    lastSync: '2026-02-21T09:00:00',
    accountCount: 2,
    riskProfile: 'conservative',
  },
  {
    id: 'cc4',
    name: 'Pedro Henrique Alves',
    email: 'pedro.h@email.com',
    initials: 'PA',
    netWorth: 890000,
    lastSync: '2026-02-23T08:45:00',
    accountCount: 3,
    riskProfile: 'moderate',
  },
];

// =============================================================================
// Client Portfolios
// =============================================================================

export const demoClientPortfolios: Record<string, ClientPortfolio> = {
  cc1: {
    summary: { totalValue: 1250000, investedValue: 1100000, profit: 150000, variation12m: 14.2 },
    allocations: [
      { class: 'fixedIncome', label: 'Renda Fixa', value: 625000, percentage: 50, color: '#3A86FF' },
      { class: 'stocks', label: 'Ações', value: 250000, percentage: 20, color: '#00D4AA' },
      { class: 'fiis', label: 'FIIs', value: 187500, percentage: 15, color: '#FFBE0B' },
      { class: 'international', label: 'Internacional', value: 125000, percentage: 10, color: '#A855F7' },
      { class: 'pension', label: 'Previdência', value: 62500, percentage: 5, color: '#F472B6' },
    ],
    topAssets: [
      { ticker: 'SELIC2029', name: 'Tesouro Selic 2029', value: 350000, variation: 4.5 },
      { ticker: 'PETR4', name: 'Petrobras PN', value: 120000, variation: 35.8 },
      { ticker: 'HGLG11', name: 'CGHG Logistica', value: 95000, variation: 8.2 },
    ],
    riskScore: 62,
  },
  cc2: {
    summary: { totalValue: 3480000, investedValue: 2900000, profit: 580000, variation12m: 22.1 },
    allocations: [
      { class: 'stocks', label: 'Ações', value: 1218000, percentage: 35, color: '#00D4AA' },
      { class: 'fixedIncome', label: 'Renda Fixa', value: 870000, percentage: 25, color: '#3A86FF' },
      { class: 'crypto', label: 'Cripto', value: 522000, percentage: 15, color: '#F3BA2F' },
      { class: 'international', label: 'Internacional', value: 522000, percentage: 15, color: '#A855F7' },
      { class: 'fiis', label: 'FIIs', value: 348000, percentage: 10, color: '#FFBE0B' },
    ],
    topAssets: [
      { ticker: 'VALE3', name: 'Vale ON', value: 480000, variation: -5.8 },
      { ticker: 'BTC', name: 'Bitcoin', value: 380000, variation: 45.2 },
      { ticker: 'VOO', name: 'Vanguard S&P 500', value: 320000, variation: 18.5 },
    ],
    riskScore: 78,
  },
  cc3: {
    summary: { totalValue: 520000, investedValue: 480000, profit: 40000, variation12m: 8.5 },
    allocations: [
      { class: 'fixedIncome', label: 'Renda Fixa', value: 390000, percentage: 75, color: '#3A86FF' },
      { class: 'fiis', label: 'FIIs', value: 78000, percentage: 15, color: '#FFBE0B' },
      { class: 'stocks', label: 'Ações', value: 52000, percentage: 10, color: '#00D4AA' },
    ],
    topAssets: [
      { ticker: 'CDB-BTG', name: 'CDB BTG 110% CDI', value: 200000, variation: 7.0 },
      { ticker: 'SELIC2029', name: 'Tesouro Selic 2029', value: 150000, variation: 4.5 },
      { ticker: 'MXRF11', name: 'Maxi Renda', value: 50000, variation: 3.7 },
    ],
    riskScore: 35,
  },
  cc4: {
    summary: { totalValue: 890000, investedValue: 780000, profit: 110000, variation12m: 16.8 },
    allocations: [
      { class: 'fixedIncome', label: 'Renda Fixa', value: 356000, percentage: 40, color: '#3A86FF' },
      { class: 'stocks', label: 'Ações', value: 222500, percentage: 25, color: '#00D4AA' },
      { class: 'international', label: 'Internacional', value: 133500, percentage: 15, color: '#A855F7' },
      { class: 'fiis', label: 'FIIs', value: 89000, percentage: 10, color: '#FFBE0B' },
      { class: 'crypto', label: 'Cripto', value: 89000, percentage: 10, color: '#F3BA2F' },
    ],
    topAssets: [
      { ticker: 'ITUB4', name: 'Itau Unibanco PN', value: 120000, variation: 24.6 },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', value: 85000, variation: 12.3 },
      { ticker: 'ETH', name: 'Ethereum', value: 65000, variation: -6.7 },
    ],
    riskScore: 58,
  },
};

// =============================================================================
// Wave 4 - Watchlist
// =============================================================================

export const demoWatchlist: WatchlistItem[] = [
  { id: 'w1', ticker: 'MGLU3', name: 'Magazine Luiza ON', class: 'stocks', currentPrice: 8.45, dailyChange: -2.3, priceHistory: [9.10, 8.95, 8.80, 8.70, 8.60, 8.50, 8.45], addedAt: '2026-02-10' },
  { id: 'w2', ticker: 'WEGE3', name: 'WEG ON', class: 'stocks', currentPrice: 42.30, dailyChange: 1.8, priceHistory: [40.50, 40.80, 41.20, 41.60, 41.90, 42.10, 42.30], addedAt: '2026-02-12' },
  { id: 'w3', ticker: 'BBDC4', name: 'Bradesco PN', class: 'stocks', currentPrice: 15.20, dailyChange: 0.5, priceHistory: [14.90, 14.95, 15.00, 15.05, 15.10, 15.15, 15.20], addedAt: '2026-02-14' },
  { id: 'w4', ticker: 'AAPL', name: 'Apple Inc', class: 'international', currentPrice: 185.50, dailyChange: -0.8, priceHistory: [188.20, 187.50, 186.90, 186.30, 185.80, 185.60, 185.50], addedAt: '2026-02-08' },
  { id: 'w5', ticker: 'TSLA', name: 'Tesla Inc', class: 'international', currentPrice: 245.80, dailyChange: 3.2, priceHistory: [235.00, 237.50, 240.10, 241.60, 243.20, 244.50, 245.80], addedAt: '2026-02-15' },
  { id: 'w6', ticker: 'SOL', name: 'Solana', class: 'crypto', currentPrice: 142.60, dailyChange: -1.5, priceHistory: [148.20, 146.80, 145.30, 144.50, 143.80, 143.10, 142.60], addedAt: '2026-02-18' },
];

// =============================================================================
// Wave 4 - Watchlist Search Results
// =============================================================================

export const demoWatchlistSearchResults: WatchlistItem[] = [
  { id: 'ws1', ticker: 'RENT3', name: 'Localiza ON', class: 'stocks', currentPrice: 58.90, dailyChange: 1.2, priceHistory: [57.50, 57.80, 58.10, 58.30, 58.50, 58.70, 58.90], addedAt: '' },
  { id: 'ws2', ticker: 'TOTS3', name: 'Totvs ON', class: 'stocks', currentPrice: 32.40, dailyChange: -0.6, priceHistory: [33.10, 32.90, 32.80, 32.70, 32.60, 32.50, 32.40], addedAt: '' },
  { id: 'ws3', ticker: 'RADL3', name: 'RD Saude ON', class: 'stocks', currentPrice: 27.80, dailyChange: 0.3, priceHistory: [27.50, 27.55, 27.60, 27.65, 27.70, 27.75, 27.80], addedAt: '' },
  { id: 'ws4', ticker: 'RAIL3', name: 'Rumo ON', class: 'stocks', currentPrice: 22.10, dailyChange: -1.1, priceHistory: [22.80, 22.60, 22.50, 22.40, 22.30, 22.20, 22.10], addedAt: '' },
  { id: 'ws5', ticker: 'SUZB3', name: 'Suzano ON', class: 'stocks', currentPrice: 55.60, dailyChange: 2.1, priceHistory: [53.80, 54.20, 54.60, 55.00, 55.20, 55.40, 55.60], addedAt: '' },
  { id: 'ws6', ticker: 'NVDA', name: 'Nvidia Corp', class: 'international', currentPrice: 875.20, dailyChange: 4.5, priceHistory: [840.00, 850.30, 855.80, 860.50, 865.10, 870.30, 875.20], addedAt: '' },
  { id: 'ws7', ticker: 'GOOGL', name: 'Alphabet Inc', class: 'international', currentPrice: 155.30, dailyChange: 0.9, priceHistory: [153.50, 153.80, 154.20, 154.50, 154.80, 155.10, 155.30], addedAt: '' },
  { id: 'ws8', ticker: 'AMZN', name: 'Amazon Inc', class: 'international', currentPrice: 192.40, dailyChange: -0.4, priceHistory: [193.80, 193.50, 193.10, 192.90, 192.70, 192.50, 192.40], addedAt: '' },
  { id: 'ws9', ticker: 'ADA', name: 'Cardano', class: 'crypto', currentPrice: 0.62, dailyChange: -2.8, priceHistory: [0.66, 0.65, 0.64, 0.63, 0.63, 0.62, 0.62], addedAt: '' },
  { id: 'ws10', ticker: 'DOT', name: 'Polkadot', class: 'crypto', currentPrice: 7.85, dailyChange: 1.4, priceHistory: [7.50, 7.55, 7.60, 7.70, 7.75, 7.80, 7.85], addedAt: '' },
];

// =============================================================================
// Wave 4 - News Articles
// =============================================================================

export const demoNewsArticles: NewsArticle[] = [
  { id: 'na1', title: 'Ibovespa fecha em alta de 1,2% com commodities em destaque', source: 'InfoMoney', date: '2026-02-23T16:30:00', summary: 'Bolsa brasileira encerrou o pregão em alta impulsionada pelo avanço das commodities metálicas e do petróleo no mercado internacional.', category: 'market', relatedTickers: ['PETR4', 'VALE3'] },
  { id: 'na2', title: 'Copom mantém Selic em 13,25% e sinaliza cautela', source: 'Valor Econômico', date: '2026-02-23T14:00:00', summary: 'Comitê de Política Monetária manteve a taxa básica inalterada, citando persistência inflacionária e cenário externo desafiador.', category: 'economy' },
  { id: 'na3', title: 'PETR4 dispara 4% após resultado acima do esperado', source: 'Bloomberg Línea', date: '2026-02-22T18:00:00', summary: 'Ações da Petrobras avançaram forte após a estatal reportar lucro líquido de R$ 38 bilhões no trimestre, superando consenso do mercado.', category: 'stocks', relatedTickers: ['PETR4'] },
  { id: 'na4', title: 'Bitcoin ultrapassa US$ 105 mil e renova máxima histórica', source: 'CoinDesk', date: '2026-02-22T12:00:00', summary: 'Principal criptomoeda do mundo atingiu novo recorde após anúncio de aprovação de ETF de Bitcoin spot em mais cinco países.', category: 'crypto', relatedTickers: ['BTC'] },
  { id: 'na5', title: 'FIIs de logística lideram captação em fevereiro', source: 'FIIs.com.br', date: '2026-02-21T15:30:00', summary: 'Fundos imobiliários de galpões logísticos captaram R$ 2,3 bilhões no mês, refletindo demanda aquecida do e-commerce.', category: 'funds', relatedTickers: ['HGLG11'] },
  { id: 'na6', title: 'PIB do Brasil cresce 0,8% no 4T25, acima do esperado', source: 'Reuters', date: '2026-02-21T10:00:00', summary: 'Economia brasileira surpreendeu com crescimento robusto no último trimestre, puxada pelo setor de serviços e consumo das famílias.', category: 'economy' },
  { id: 'na7', title: 'VALE3 recua com queda do minério de ferro na China', source: 'Exame', date: '2026-02-20T17:00:00', summary: 'Ações da Vale caíram 2,5% acompanhando a desvalorização do minério de ferro no mercado chinês após dados fracos de construção.', category: 'stocks', relatedTickers: ['VALE3'] },
  { id: 'na8', title: 'Ethereum 2.0 completa upgrade com sucesso', source: 'CoinTelegraph', date: '2026-02-20T09:00:00', summary: 'Rede Ethereum concluiu atualização que reduziu taxas de gás em 40% e aumentou velocidade de transações para 100 mil por segundo.', category: 'crypto', relatedTickers: ['ETH'] },
  { id: 'na9', title: 'Dólar fecha a R$ 5,72 com fluxo estrangeiro positivo', source: 'InfoMoney', date: '2026-02-19T18:30:00', summary: 'Moeda americana recuou frente ao real com entrada de capital estrangeiro na B3 e expectativa de manutenção da Selic.', category: 'market' },
  { id: 'na10', title: 'ITUB4 anuncia programa de recompra de R$ 3 bilhões', source: 'Valor Investe', date: '2026-02-19T14:00:00', summary: 'Itaú Unibanco aprovou novo programa de recompra de ações próprias, sinalizando confiança da gestão no valor da companhia.', category: 'stocks', relatedTickers: ['ITUB4'] },
  { id: 'na11', title: 'CDBs de bancos médios oferecem até 130% do CDI', source: 'Seu Dinheiro', date: '2026-02-18T16:00:00', summary: 'Com taxa Selic elevada, CDBs de bancos menores oferecem retornos atrativos para investidores de renda fixa com perfil moderado.', category: 'market' },
  { id: 'na12', title: 'Reforma tributária: novas regras para dividendos', source: 'Folha de S.Paulo', date: '2026-02-18T08:00:00', summary: 'Governo federal detalhou proposta que tributará dividendos acima de R$ 20 mil mensais em 15%, gerando debate no mercado.', category: 'economy' },
  { id: 'na13', title: 'BBAS3 pagará dividendos recordes de R$ 2,40 por ação', source: 'Status Invest', date: '2026-02-17T14:30:00', summary: 'Banco do Brasil anunciou distribuição recorde de proventos referente ao exercício de 2025, com yield projetado de 12%.', category: 'stocks', relatedTickers: ['BBAS3'] },
  { id: 'na14', title: 'Fundos multimercado perdem para o CDI pelo 3o ano', source: 'Exame', date: '2026-02-17T11:00:00', summary: 'Levantamento mostra que 78% dos fundos multimercado ficaram abaixo do CDI em 2025, gerando migração para renda fixa.', category: 'funds' },
  { id: 'na15', title: 'S&P 500 atinge novo recorde com resultados de tech', source: 'CNBC', date: '2026-02-16T21:00:00', summary: 'Índice americano renovou máxima impulsionado por resultados trimestrais acima do esperado das big techs.', category: 'market' },
  { id: 'na16', title: 'XPML11 anuncia rendimento de R$ 0,92 por cota', source: 'FIIs.com.br', date: '2026-02-16T15:00:00', summary: 'Fundo de shoppings XP Malls distribuirá rendimento mensal acima da média, refletindo forte ocupação dos empreendimentos.', category: 'funds', relatedTickers: ['XPML11'] },
  { id: 'na17', title: 'Inflação de fevereiro surpreende para baixo: IPCA de 0,35%', source: 'IBGE', date: '2026-02-16T09:00:00', summary: 'Índice oficial de inflação veio abaixo das expectativas do mercado, reforçando tese de início do ciclo de corte da Selic.', category: 'economy' },
  { id: 'na18', title: 'Solana ultrapassa Ethereum em volume de transações diárias', source: 'The Block', date: '2026-02-16T07:00:00', summary: 'Blockchain Solana processou 85 milhões de transações em 24h, superando Ethereum pela primeira vez desde o upgrade.', category: 'crypto', relatedTickers: ['SOL'] },
];

// =============================================================================
// Wave 4 - Dividend Calendar
// =============================================================================

export const demoDividendMonths: DividendMonth[] = [
  { month: 'Jan', date: '2026-01', totalIncome: 1850, events: [
    { id: 'de1', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.78, totalAmount: 390, exDate: '2025-12-30', paymentDate: '2026-01-15', quantity: 500 },
    { id: 'de2', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.92, totalAmount: 276, exDate: '2025-12-30', paymentDate: '2026-01-15', quantity: 300 },
    { id: 'de3', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.72, totalAmount: 144, exDate: '2025-12-30', paymentDate: '2026-01-15', quantity: 200 },
    { id: 'de4', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2025-12-30', paymentDate: '2026-01-15', quantity: 1000 },
    { id: 'de5', ticker: 'ITUB4', assetName: 'Itau Unibanco PN', type: 'jcp', amountPerShare: 1.12, totalAmount: 940, exDate: '2025-12-20', paymentDate: '2026-01-10', quantity: 839 },
  ]},
  { month: 'Fev', date: '2026-02', totalIncome: 1210, events: [
    { id: 'de6', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.80, totalAmount: 400, exDate: '2026-01-30', paymentDate: '2026-02-14', quantity: 500 },
    { id: 'de7', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.92, totalAmount: 276, exDate: '2026-01-30', paymentDate: '2026-02-14', quantity: 300 },
    { id: 'de8', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.74, totalAmount: 148, exDate: '2026-01-30', paymentDate: '2026-02-14', quantity: 200 },
    { id: 'de9', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-01-30', paymentDate: '2026-02-14', quantity: 1000 },
    { id: 'de10', ticker: 'BBAS3', assetName: 'Banco do Brasil ON', type: 'dividend', amountPerShare: 0.82, totalAmount: 286, exDate: '2026-02-05', paymentDate: '2026-02-20', quantity: 349 },
  ]},
  { month: 'Mar', date: '2026-03', totalIncome: 2450, events: [
    { id: 'de11', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.79, totalAmount: 395, exDate: '2026-02-27', paymentDate: '2026-03-14', quantity: 500 },
    { id: 'de12', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.95, totalAmount: 285, exDate: '2026-02-27', paymentDate: '2026-03-14', quantity: 300 },
    { id: 'de13', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.75, totalAmount: 150, exDate: '2026-02-27', paymentDate: '2026-03-14', quantity: 200 },
    { id: 'de14', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-02-27', paymentDate: '2026-03-14', quantity: 1000 },
    { id: 'de15', ticker: 'PETR4', assetName: 'Petrobras PN', type: 'dividend', amountPerShare: 2.85, totalAmount: 1140, exDate: '2026-03-10', paymentDate: '2026-03-25', quantity: 400 },
    { id: 'de16', ticker: 'ABEV3', assetName: 'Ambev ON', type: 'dividend', amountPerShare: 0.38, totalAmount: 380, exDate: '2026-03-12', paymentDate: '2026-03-28', quantity: 1000 },
  ]},
  { month: 'Abr', date: '2026-04', totalIncome: 1010, events: [
    { id: 'de17', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.80, totalAmount: 400, exDate: '2026-03-30', paymentDate: '2026-04-14', quantity: 500 },
    { id: 'de18', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.90, totalAmount: 270, exDate: '2026-03-30', paymentDate: '2026-04-14', quantity: 300 },
    { id: 'de19', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.72, totalAmount: 144, exDate: '2026-03-30', paymentDate: '2026-04-14', quantity: 200 },
    { id: 'de20', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-03-30', paymentDate: '2026-04-14', quantity: 1000 },
    { id: 'de21', ticker: 'ITUB4', assetName: 'Itau Unibanco PN', type: 'jcp', amountPerShare: 0.12, totalAmount: 96, exDate: '2026-04-01', paymentDate: '2026-04-15', quantity: 839 },
  ]},
  { month: 'Mai', date: '2026-05', totalIncome: 1520, events: [
    { id: 'de22', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.81, totalAmount: 405, exDate: '2026-04-29', paymentDate: '2026-05-14', quantity: 500 },
    { id: 'de23', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.93, totalAmount: 279, exDate: '2026-04-29', paymentDate: '2026-05-14', quantity: 300 },
    { id: 'de24', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.73, totalAmount: 146, exDate: '2026-04-29', paymentDate: '2026-05-14', quantity: 200 },
    { id: 'de25', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-04-29', paymentDate: '2026-05-14', quantity: 1000 },
    { id: 'de26', ticker: 'BBAS3', assetName: 'Banco do Brasil ON', type: 'dividend', amountPerShare: 1.70, totalAmount: 590, exDate: '2026-05-08', paymentDate: '2026-05-22', quantity: 349 },
  ]},
  { month: 'Jun', date: '2026-06', totalIncome: 2680, events: [
    { id: 'de27', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.82, totalAmount: 410, exDate: '2026-05-29', paymentDate: '2026-06-14', quantity: 500 },
    { id: 'de28', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.94, totalAmount: 282, exDate: '2026-05-29', paymentDate: '2026-06-14', quantity: 300 },
    { id: 'de29', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.76, totalAmount: 152, exDate: '2026-05-29', paymentDate: '2026-06-14', quantity: 200 },
    { id: 'de30', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-05-29', paymentDate: '2026-06-14', quantity: 1000 },
    { id: 'de31', ticker: 'PETR4', assetName: 'Petrobras PN', type: 'dividend', amountPerShare: 3.10, totalAmount: 1240, exDate: '2026-06-10', paymentDate: '2026-06-25', quantity: 400 },
    { id: 'de32', ticker: 'ITUB4', assetName: 'Itau Unibanco PN', type: 'jcp', amountPerShare: 0.60, totalAmount: 496, exDate: '2026-06-15', paymentDate: '2026-06-30', quantity: 839 },
  ]},
  { month: 'Jul', date: '2026-07', totalIncome: 930, events: [
    { id: 'de33', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.80, totalAmount: 400, exDate: '2026-06-29', paymentDate: '2026-07-14', quantity: 500 },
    { id: 'de34', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.90, totalAmount: 270, exDate: '2026-06-29', paymentDate: '2026-07-14', quantity: 300 },
    { id: 'de35', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.73, totalAmount: 146, exDate: '2026-06-29', paymentDate: '2026-07-14', quantity: 200 },
    { id: 'de36', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-06-29', paymentDate: '2026-07-14', quantity: 1000 },
  ]},
  { month: 'Ago', date: '2026-08', totalIncome: 1490, events: [
    { id: 'de37', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.83, totalAmount: 415, exDate: '2026-07-30', paymentDate: '2026-08-14', quantity: 500 },
    { id: 'de38', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.92, totalAmount: 276, exDate: '2026-07-30', paymentDate: '2026-08-14', quantity: 300 },
    { id: 'de39', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.74, totalAmount: 148, exDate: '2026-07-30', paymentDate: '2026-08-14', quantity: 200 },
    { id: 'de40', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-07-30', paymentDate: '2026-08-14', quantity: 1000 },
    { id: 'de41', ticker: 'BBAS3', assetName: 'Banco do Brasil ON', type: 'dividend', amountPerShare: 1.58, totalAmount: 551, exDate: '2026-08-06', paymentDate: '2026-08-20', quantity: 349 },
  ]},
  { month: 'Set', date: '2026-09', totalIncome: 2320, events: [
    { id: 'de42', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.81, totalAmount: 405, exDate: '2026-08-28', paymentDate: '2026-09-14', quantity: 500 },
    { id: 'de43', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.91, totalAmount: 273, exDate: '2026-08-28', paymentDate: '2026-09-14', quantity: 300 },
    { id: 'de44', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.75, totalAmount: 150, exDate: '2026-08-28', paymentDate: '2026-09-14', quantity: 200 },
    { id: 'de45', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-08-28', paymentDate: '2026-09-14', quantity: 1000 },
    { id: 'de46', ticker: 'PETR4', assetName: 'Petrobras PN', type: 'dividend', amountPerShare: 2.95, totalAmount: 1180, exDate: '2026-09-10', paymentDate: '2026-09-25', quantity: 400 },
    { id: 'de47', ticker: 'ABEV3', assetName: 'Ambev ON', type: 'dividend', amountPerShare: 0.22, totalAmount: 220, exDate: '2026-09-12', paymentDate: '2026-09-26', quantity: 1000 },
  ]},
  { month: 'Out', date: '2026-10', totalIncome: 1010, events: [
    { id: 'de48', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.82, totalAmount: 410, exDate: '2026-09-29', paymentDate: '2026-10-14', quantity: 500 },
    { id: 'de49', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.93, totalAmount: 279, exDate: '2026-09-29', paymentDate: '2026-10-14', quantity: 300 },
    { id: 'de50', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.73, totalAmount: 146, exDate: '2026-09-29', paymentDate: '2026-10-14', quantity: 200 },
    { id: 'de51', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-09-29', paymentDate: '2026-10-14', quantity: 1000 },
    { id: 'de52', ticker: 'ITUB4', assetName: 'Itau Unibanco PN', type: 'jcp', amountPerShare: 0.09, totalAmount: 75, exDate: '2026-10-01', paymentDate: '2026-10-15', quantity: 839 },
  ]},
  { month: 'Nov', date: '2026-11', totalIncome: 1510, events: [
    { id: 'de53', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.84, totalAmount: 420, exDate: '2026-10-30', paymentDate: '2026-11-14', quantity: 500 },
    { id: 'de54', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.94, totalAmount: 282, exDate: '2026-10-30', paymentDate: '2026-11-14', quantity: 300 },
    { id: 'de55', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.76, totalAmount: 152, exDate: '2026-10-30', paymentDate: '2026-11-14', quantity: 200 },
    { id: 'de56', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-10-30', paymentDate: '2026-11-14', quantity: 1000 },
    { id: 'de57', ticker: 'BBAS3', assetName: 'Banco do Brasil ON', type: 'dividend', amountPerShare: 1.60, totalAmount: 558, exDate: '2026-11-06', paymentDate: '2026-11-20', quantity: 349 },
  ]},
  { month: 'Dez', date: '2026-12', totalIncome: 3240, events: [
    { id: 'de58', ticker: 'HGLG11', assetName: 'CSHG Logística', type: 'rendimento', amountPerShare: 0.85, totalAmount: 425, exDate: '2026-11-28', paymentDate: '2026-12-14', quantity: 500 },
    { id: 'de59', ticker: 'XPML11', assetName: 'XP Malls', type: 'rendimento', amountPerShare: 0.96, totalAmount: 288, exDate: '2026-11-28', paymentDate: '2026-12-14', quantity: 300 },
    { id: 'de60', ticker: 'KNRI11', assetName: 'Kinea Renda', type: 'rendimento', amountPerShare: 0.77, totalAmount: 154, exDate: '2026-11-28', paymentDate: '2026-12-14', quantity: 200 },
    { id: 'de61', ticker: 'MXRF11', assetName: 'Maxi Renda', type: 'rendimento', amountPerShare: 0.10, totalAmount: 100, exDate: '2026-11-28', paymentDate: '2026-12-14', quantity: 1000 },
    { id: 'de62', ticker: 'PETR4', assetName: 'Petrobras PN', type: 'dividend', amountPerShare: 3.25, totalAmount: 1300, exDate: '2026-12-10', paymentDate: '2026-12-22', quantity: 400 },
    { id: 'de63', ticker: 'ITUB4', assetName: 'Itau Unibanco PN', type: 'jcp', amountPerShare: 1.15, totalAmount: 965, exDate: '2026-12-15', paymentDate: '2026-12-29', quantity: 839 },
    { id: 'de64', ticker: 'ABEV3', assetName: 'Ambev ON', type: 'dividend', amountPerShare: 0.01, totalAmount: 8, exDate: '2026-12-18', paymentDate: '2026-12-30', quantity: 1000 },
  ]},
];

// =============================================================================
// Wave 4 - Asset Comparison
// =============================================================================

export const demoComparisonAssets: AssetComparisonData[] = [
  { ticker: 'PETR4', name: 'Petrobras PN', ytdReturn: 12.5, return12m: 35.2, volatility: 28.4, dividendYield: 14.2, pe: 4.8, marketCap: 520000000000, color: '#3A86FF' },
  { ticker: 'VALE3', name: 'Vale ON', ytdReturn: -3.8, return12m: -8.5, volatility: 32.1, dividendYield: 8.5, pe: 6.2, marketCap: 310000000000, color: '#00D4AA' },
  { ticker: 'ITUB4', name: 'Itau PN', ytdReturn: 8.2, return12m: 24.6, volatility: 18.5, dividendYield: 6.8, pe: 8.5, marketCap: 340000000000, color: '#FF6B6B' },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON', ytdReturn: 6.5, return12m: 18.3, volatility: 22.0, dividendYield: 12.0, pe: 5.5, marketCap: 180000000000, color: '#FFBE0B' },
  { ticker: 'ABEV3', name: 'Ambev ON', ytdReturn: 2.1, return12m: 5.8, volatility: 15.2, dividendYield: 4.5, pe: 16.8, marketCap: 240000000000, color: '#A855F7' },
  { ticker: 'HGLG11', name: 'CSHG Logística', ytdReturn: 4.8, return12m: 12.5, volatility: 10.2, dividendYield: 8.9, pe: 0, marketCap: 5200000000, color: '#F97316' },
  { ticker: 'BTC', name: 'Bitcoin', ytdReturn: 18.5, return12m: 85.2, volatility: 55.0, dividendYield: 0, pe: 0, marketCap: 2050000000000, color: '#F3BA2F' },
  { ticker: 'WEGE3', name: 'WEG ON', ytdReturn: 15.2, return12m: 32.8, volatility: 20.5, dividendYield: 1.2, pe: 35.0, marketCap: 195000000000, color: '#818CF8' },
];

// =============================================================================
// Wave 4 - Budget
// =============================================================================

export const demoBudget: MonthlyBudget = {
  month: '2026-02',
  totalLimit: 17000,
  totalSpent: 15600,
  categories: [
    { category: 'food', limit: 5000, spent: 4850, color: '#FF6B6B', icon: '\uD83C\uDF54' },
    { category: 'transport', limit: 2500, spent: 1890, color: '#3A86FF', icon: '\uD83D\uDE97' },
    { category: 'subscriptions', limit: 1000, spent: 780, color: '#A855F7', icon: '\uD83D\uDCF1' },
    { category: 'shopping', limit: 3500, spent: 3200, color: '#00D4AA', icon: '\uD83D\uDECD\uFE0F' },
    { category: 'fuel', limit: 2000, spent: 1560, color: '#FFBE0B', icon: '\u26FD' },
    { category: 'health', limit: 1000, spent: 420, color: '#F97316', icon: '\uD83C\uDFE5' },
    { category: 'travel', limit: 0, spent: 340, color: '#06B6D4', icon: '\u2708\uFE0F' },
    { category: 'tech', limit: 2000, spent: 1560, color: '#818CF8', icon: '\uD83D\uDCBB' },
  ],
};

// =============================================================================
// Wave 4 - Cash Flow
// =============================================================================

export const demoCashFlow: CashFlowMonth[] = [
  { month: 'Mar', date: '2026-03', income: 18000, expenses: 15500, savings: 2500 },
  { month: 'Abr', date: '2026-04', income: 18000, expenses: 14200, savings: 3800 },
  { month: 'Mai', date: '2026-05', income: 18500, expenses: 16000, savings: 2500 },
  { month: 'Jun', date: '2026-06', income: 18500, expenses: 14800, savings: 3700 },
  { month: 'Jul', date: '2026-07', income: 19000, expenses: 15200, savings: 3800 },
  { month: 'Ago', date: '2026-08', income: 19000, expenses: 15800, savings: 3200 },
];

// =============================================================================
// Wave 4 - Spending Insights
// =============================================================================

export const demoSpendingInsights: SpendingInsightsData = {
  categoryTrends: [
    { category: 'food', label: 'Alimentação', color: '#FF6B6B', months: [{ month: 'Nov', amount: 4200 }, { month: 'Dez', amount: 5100 }, { month: 'Jan', amount: 4600 }, { month: 'Fev', amount: 4850 }] },
    { category: 'transport', label: 'Transporte', color: '#3A86FF', months: [{ month: 'Nov', amount: 1800 }, { month: 'Dez', amount: 2100 }, { month: 'Jan', amount: 1950 }, { month: 'Fev', amount: 1890 }] },
    { category: 'shopping', label: 'Compras', color: '#00D4AA', months: [{ month: 'Nov', amount: 2800 }, { month: 'Dez', amount: 4500 }, { month: 'Jan', amount: 2200 }, { month: 'Fev', amount: 3200 }] },
    { category: 'subscriptions', label: 'Assinaturas', color: '#A855F7', months: [{ month: 'Nov', amount: 750 }, { month: 'Dez', amount: 780 }, { month: 'Jan', amount: 780 }, { month: 'Fev', amount: 780 }] },
    { category: 'fuel', label: 'Combustível', color: '#FFBE0B', months: [{ month: 'Nov', amount: 1400 }, { month: 'Dez', amount: 1600 }, { month: 'Jan', amount: 1500 }, { month: 'Fev', amount: 1560 }] },
    { category: 'tech', label: 'Tecnologia', color: '#818CF8', months: [{ month: 'Nov', amount: 800 }, { month: 'Dez', amount: 2200 }, { month: 'Jan', amount: 500 }, { month: 'Fev', amount: 1560 }] },
  ],
  topMerchants: [
    { name: 'iFood', total: 2850, count: 24 },
    { name: 'Uber', total: 1420, count: 32 },
    { name: 'Amazon', total: 1280, count: 5 },
    { name: 'Shell', total: 980, count: 8 },
    { name: 'Netflix', total: 55.90, count: 1 },
  ],
  avgDailySpend: 520,
  biggestExpense: { description: 'Apple Store - AirPods Pro', amount: 2099, date: '2026-02-18' },
  spendingVelocity: 108,
  savingsRate: 14.5,
  totalThisMonth: 15600,
  totalLastMonth: 14200,
};

// =============================================================================
// Wave 4 - Bills
// =============================================================================

export const demoBills: Bill[] = [
  { id: 'b1', name: 'Aluguel', amount: 3500, dueDate: '2026-03-05', frequency: 'monthly', category: 'shopping', status: 'paid', icon: '\uD83C\uDFE0', color: '#3A86FF', reminder: true, createdAt: '2025-01-01' },
  { id: 'b2', name: 'Condomínio', amount: 850, dueDate: '2026-03-10', frequency: 'monthly', category: 'shopping', status: 'paid', icon: '\uD83C\uDFE2', color: '#00D4AA', reminder: true, createdAt: '2025-01-01' },
  { id: 'b3', name: 'Netflix', amount: 55.90, dueDate: '2026-03-17', frequency: 'monthly', category: 'subscriptions', status: 'pending', icon: '\uD83C\uDFAC', color: '#E50914', reminder: false, createdAt: '2025-03-15' },
  { id: 'b4', name: 'Spotify', amount: 34.90, dueDate: '2026-03-15', frequency: 'monthly', category: 'subscriptions', status: 'paid', icon: '\uD83C\uDFB5', color: '#1DB954', reminder: false, createdAt: '2025-06-01' },
  { id: 'b5', name: 'Seguro Auto', amount: 280, dueDate: '2026-03-20', frequency: 'monthly', category: 'transport', status: 'pending', icon: '\uD83D\uDE97', color: '#FFBE0B', reminder: true, createdAt: '2025-07-01' },
  { id: 'b6', name: 'Internet Vivo', amount: 149.90, dueDate: '2026-03-12', frequency: 'monthly', category: 'tech', status: 'paid', icon: '\uD83C\uDF10', color: '#A855F7', reminder: true, createdAt: '2025-01-01' },
  { id: 'b7', name: 'Energia Enel', amount: 320, dueDate: '2026-03-22', frequency: 'monthly', category: 'shopping', status: 'pending', icon: '\u26A1', color: '#F97316', reminder: true, createdAt: '2025-01-01' },
  { id: 'b8', name: 'Gympass', amount: 149.90, dueDate: '2026-03-13', frequency: 'monthly', category: 'health', status: 'paid', icon: '\uD83C\uDFCB\uFE0F', color: '#06B6D4', reminder: false, createdAt: '2025-09-01' },
];

// =============================================================================
// Wave 5 - Correlation Matrix
// =============================================================================

const CORR_TICKERS = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'HGLG11', 'XPML11', 'BTC', 'SELIC'];

// Symmetric 8x8 matrix with realistic correlations
const CORR_VALUES: number[][] = [
  [ 1.00,  0.72,  0.45,  0.42,  0.15,  0.12, -0.08, -0.25],
  [ 0.72,  1.00,  0.38,  0.35,  0.10,  0.08, -0.12, -0.30],
  [ 0.45,  0.38,  1.00,  0.85,  0.22,  0.20,  0.05, -0.15],
  [ 0.42,  0.35,  0.85,  1.00,  0.20,  0.18,  0.03, -0.18],
  [ 0.15,  0.10,  0.22,  0.20,  1.00,  0.78, -0.05,  0.30],
  [ 0.12,  0.08,  0.20,  0.18,  0.78,  1.00, -0.03,  0.28],
  [-0.08, -0.12,  0.05,  0.03, -0.05, -0.03,  1.00, -0.40],
  [-0.25, -0.30, -0.15, -0.18,  0.30,  0.28, -0.40,  1.00],
];

export const demoCorrelationMatrix: CorrelationMatrix = {
  tickers: CORR_TICKERS,
  values: CORR_VALUES,
  diversificationScore: 68,
};

// =============================================================================
// Wave 5 - Backtest Result
// =============================================================================

function generateBacktestReturns(): BacktestPeriodReturn[] {
  const returns: BacktestPeriodReturn[] = [];
  let value = 100000;
  const start = new Date(2021, 0, 1);
  for (let i = 0; i < 60; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${mm}`;
    // Realistic monthly returns with noise
    const monthReturn = 0.8 + Math.sin(i * 0.5) * 1.5 + Math.cos(i * 1.3) * 0.8;
    value = Math.round(value * (1 + monthReturn / 100));
    returns.push({ date: dateStr, value, returnPct: parseFloat(monthReturn.toFixed(2)) });
  }
  return returns;
}

const backtestReturns = generateBacktestReturns();
const bestMonth = backtestReturns.reduce((a, b) => (b.returnPct > a.returnPct ? b : a));
const worstMonth = backtestReturns.reduce((a, b) => (b.returnPct < a.returnPct ? b : a));

export const demoBacktestResult: BacktestResult = {
  allocations: [
    { ticker: 'PETR4', name: 'Petrobras PN', percentage: 25, color: '#00D4AA' },
    { ticker: 'VALE3', name: 'Vale ON', percentage: 20, color: '#3A86FF' },
    { ticker: 'ITUB4', name: 'Itau PN', percentage: 20, color: '#FFBE0B' },
    { ticker: 'HGLG11', name: 'CSHG Log', percentage: 15, color: '#A855F7' },
    { ticker: 'BTC', name: 'Bitcoin', percentage: 10, color: '#F3BA2F' },
    { ticker: 'SELIC', name: 'Tesouro Selic', percentage: 10, color: '#F472B6' },
  ],
  periodReturns: backtestReturns,
  totalReturn: parseFloat(((backtestReturns[backtestReturns.length - 1].value / 100000 - 1) * 100).toFixed(2)),
  cagr: 12.8,
  maxDrawdown: -14.2,
  sharpe: 1.35,
  bestMonth,
  worstMonth,
  initialValue: 100000,
  finalValue: backtestReturns[backtestReturns.length - 1].value,
};

// =============================================================================
// Wave 5 - Scenario Presets
// =============================================================================

export const demoScenarioPresets: ScenarioPreset[] = [
  {
    type: 'bull',
    label: 'Bull Market',
    emoji: '\uD83D\uDCC8',
    description: '+20% stocks, +15% FIIs, +5% bonds, +30% crypto',
    changes: { stocks: 20, fiis: 15, fixedIncome: 5, crypto: 30, international: 18, pension: 8 },
  },
  {
    type: 'bear',
    label: 'Bear Market',
    emoji: '\uD83D\uDCC9',
    description: '-30% stocks, -20% FIIs, +2% bonds, -40% crypto',
    changes: { stocks: -30, fiis: -20, fixedIncome: 2, crypto: -40, international: -25, pension: -5 },
  },
  {
    type: 'rateHike',
    label: 'Rate Hike',
    emoji: '\uD83D\uDCB0',
    description: '-10% stocks, -15% FIIs, +8% bonds, -5% crypto',
    changes: { stocks: -10, fiis: -15, fixedIncome: 8, crypto: -5, international: -8, pension: 6 },
  },
  {
    type: 'crash',
    label: 'Market Crash',
    emoji: '\uD83D\uDCA5',
    description: '-50% stocks, -40% FIIs, +3% bonds, -60% crypto',
    changes: { stocks: -50, fiis: -40, fixedIncome: 3, crypto: -60, international: -45, pension: -10 },
  },
  {
    type: 'custom',
    label: 'Custom',
    emoji: '\u2699\uFE0F',
    description: 'Define your own scenario',
    changes: { stocks: 0, fiis: 0, fixedIncome: 0, crypto: 0, international: 0, pension: 0 },
  },
];

// =============================================================================
// Wave 5 - Price Alerts
// =============================================================================

export const demoPriceAlerts: PriceAlert[] = [
  { id: 'pa1', ticker: 'PETR4', name: 'Petrobras PN', condition: 'above', targetPrice: 42.00, currentPrice: 38.50, status: 'active', createdAt: '2026-02-15T10:00:00' },
  { id: 'pa2', ticker: 'VALE3', name: 'Vale ON', condition: 'below', targetPrice: 58.00, currentPrice: 62.30, status: 'active', createdAt: '2026-02-16T14:00:00' },
  { id: 'pa3', ticker: 'BTC', name: 'Bitcoin', condition: 'above', targetPrice: 100000, currentPrice: 105200, status: 'triggered', createdAt: '2026-02-10T09:00:00', triggeredAt: '2026-02-22T12:00:00' },
  { id: 'pa4', ticker: 'ITUB4', name: 'Itau PN', condition: 'above', targetPrice: 35.00, currentPrice: 33.80, status: 'active', createdAt: '2026-02-18T08:30:00' },
  { id: 'pa5', ticker: 'MGLU3', name: 'Magazine Luiza ON', condition: 'below', targetPrice: 8.00, currentPrice: 8.45, status: 'active', createdAt: '2026-02-20T16:00:00' },
  { id: 'pa6', ticker: 'WEGE3', name: 'WEG ON', condition: 'above', targetPrice: 45.00, currentPrice: 42.30, status: 'expired', createdAt: '2026-01-05T11:00:00' },
];

// =============================================================================
// Wave 5 - Recurring Investments
// =============================================================================

export const demoRecurringInvestments: RecurringInvestment[] = [
  { id: 'ri1', ticker: 'PETR4', name: 'Petrobras PN', amount: 500, frequency: 'monthly', executionDay: 5, status: 'active', nextExecution: '2026-03-05', createdAt: '2025-06-01' },
  { id: 'ri2', ticker: 'ITUB4', name: 'Itau PN', amount: 300, frequency: 'monthly', executionDay: 10, status: 'active', nextExecution: '2026-03-10', createdAt: '2025-08-15' },
  { id: 'ri3', ticker: 'BTC', name: 'Bitcoin', amount: 200, frequency: 'biweekly', executionDay: 1, status: 'active', nextExecution: '2026-03-01', createdAt: '2025-10-01' },
  { id: 'ri4', ticker: 'HGLG11', name: 'CSHG Logistica', amount: 400, frequency: 'monthly', executionDay: 15, status: 'paused', nextExecution: '2026-03-15', createdAt: '2025-04-20' },
];

// =============================================================================
// Wave 6 - Net Worth Timeline
// =============================================================================

function generateNetWorthTimeline(): NetWorthDataPoint[] {
  const points: NetWorthDataPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const progress = (24 - i) / 24;
    const assets = Math.round(600000 + 400000 * progress + Math.sin(i * 0.8) * 15000);
    const liabilities = Math.round(180000 - 60000 * progress + Math.cos(i * 1.2) * 5000);
    points.push({ date: `${d.getFullYear()}-${mm}`, assets, liabilities, netWorth: assets - liabilities });
  }
  return points;
}

const nwTimeline = generateNetWorthTimeline();

export const demoNetWorthSummary: NetWorthSummary = {
  currentNetWorth: nwTimeline[nwTimeline.length - 1].netWorth,
  totalAssets: nwTimeline[nwTimeline.length - 1].assets,
  totalLiabilities: nwTimeline[nwTimeline.length - 1].liabilities,
  momGrowth: 3.2,
  yoyGrowth: 28.5,
  allTimeGrowth: 85.4,
  timeline: nwTimeline,
  milestones: [
    { id: 'nwm1', label: 'Primeiro R$ 500k', emoji: '\uD83C\uDF89', date: '2025-04', value: 500000 },
    { id: 'nwm2', label: 'Quitei o carro', emoji: '\uD83D\uDE97', date: '2025-08', value: 620000 },
    { id: 'nwm3', label: 'R$ 750k', emoji: '\uD83D\uDCA0', date: '2025-12', value: 750000 },
    { id: 'nwm4', label: 'Patrimônio recorde', emoji: '\uD83D\uDE80', date: '2026-02', value: nwTimeline[nwTimeline.length - 1].netWorth },
  ],
};

// =============================================================================
// Wave 6 - Debts
// =============================================================================

export const demoDebts: Debt[] = [
  { id: 'd1', name: 'Financiamento Apto', type: 'mortgage', totalAmount: 450000, remainingAmount: 320000, interestRate: 9.5, minimumPayment: 3200, dueDate: '2026-03-10', createdAt: '2020-06-01' },
  { id: 'd2', name: 'Empréstimo Pessoal', type: 'loan', totalAmount: 50000, remainingAmount: 18500, interestRate: 15.2, minimumPayment: 1850, dueDate: '2026-03-05', createdAt: '2024-01-15' },
  { id: 'd3', name: 'Cartão Nubank', type: 'credit_card', totalAmount: 12450, remainingAmount: 12450, interestRate: 14.0, minimumPayment: 620, dueDate: '2026-03-10', createdAt: '2026-02-01' },
  { id: 'd4', name: 'Financiamento Estudantil', type: 'student_loan', totalAmount: 80000, remainingAmount: 42000, interestRate: 6.5, minimumPayment: 950, dueDate: '2026-03-15', createdAt: '2019-03-01' },
];

export const demoPayoffComparison: PayoffComparison = {
  snowball: { totalInterest: 145200, months: 84 },
  avalanche: { totalInterest: 128400, months: 78 },
  interestSaved: 16800,
  monthsSaved: 6,
};

// =============================================================================
// Wave 6 - Retirement
// =============================================================================

export const demoRetirementParams: RetirementParams = {
  currentAge: 32,
  retirementAge: 55,
  monthlyContribution: 5000,
  expectedReturn: 10,
  currentSavings: 847350,
  monthlyExpenses: 12000,
  inflation: 5,
};

export const demoRetirementResult: RetirementResult = {
  projectedFund: 8540000,
  monthlyRetirementIncome: 42700,
  fireNumber: 3600000,
  surplus: 4940000,
  timelineByAge: Array.from({ length: 34 }, (_, i) => {
    const age = 32 + i;
    const years = i;
    const balance = Math.round(847350 * Math.pow(1.08, years) + 5000 * 12 * ((Math.pow(1.08, years) - 1) / 0.08));
    return { age, balance };
  }),
};

// =============================================================================
// Wave 6 - Monte Carlo
// =============================================================================

function generateMonteCarloPercentiles(horizon: number, initial: number): MonteCarloPercentile[] {
  const labels = ['10th', '25th', '50th', '75th', '90th'];
  const growthRates = [0.02, 0.05, 0.08, 0.11, 0.15];
  const mcColors = ['rgba(58,134,255,0.15)', 'rgba(58,134,255,0.30)', '#3A86FF', 'rgba(58,134,255,0.30)', 'rgba(58,134,255,0.15)'];
  return labels.map((label, idx) => ({
    label,
    values: Array.from({ length: horizon + 1 }, (_, y) => Math.round(initial * Math.pow(1 + growthRates[idx], y))),
    color: mcColors[idx],
  }));
}

export const demoMonteCarloResult: MonteCarloResult = {
  horizon: 20,
  initialValue: 847350,
  targetValue: 3000000,
  successProbability: 78,
  medianOutcome: 3948000,
  bestCase: 9850000,
  worstCase: 1240000,
  percentiles: generateMonteCarloPercentiles(20, 847350),
  years: Array.from({ length: 21 }, (_, i) => i),
};

// =============================================================================
// Wave 6 - Learn Hub
// =============================================================================

export const demoLessons: Lesson[] = [
  { id: 'l1', emoji: '\uD83D\uDCB0', title: 'O que é Renda Fixa?', description: 'Entenda os principais títulos de renda fixa do Brasil.', category: 'beginner', readingTimeMin: 5, content: 'Renda fixa é uma classe de investimentos onde as condições de rentabilidade são definidas no momento da aplicação. Os principais títulos incluem Tesouro Direto (Selic, IPCA+, Prefixado), CDBs, LCIs, LCAs e debêntures. São considerados investimentos mais seguros, ideais para reserva de emergência e objetivos de curto prazo.' },
  { id: 'l2', emoji: '\uD83D\uDCC8', title: 'Introdução à Bolsa', description: 'Como funciona o mercado de ações brasileiro.', category: 'beginner', readingTimeMin: 7, content: 'A B3 (Brasil, Bolsa, Balcão) é a bolsa de valores brasileira. Ao comprar ações, você se torna sócio de empresas. Os ganhos vêm da valorização dos papéis e de dividendos. É importante diversificar e investir com visão de longo prazo. Utilize análise fundamentalista para escolher boas empresas.' },
  { id: 'l3', emoji: '\uD83C\uDFE2', title: 'FIIs - Fundos Imobiliários', description: 'Renda passiva com imóveis sem comprar imóveis.', category: 'beginner', readingTimeMin: 6, content: 'Fundos de Investimento Imobiliário (FIIs) permitem investir em imóveis com pouco dinheiro. Os rendimentos mensais são isentos de IR para pessoa física. Existem FIIs de tijolo (galpões, shoppings, escritórios) e de papel (CRIs, LCIs). São negociados na bolsa como ações.' },
  { id: 'l4', emoji: '\u2696\uFE0F', title: 'Diversificação de Carteira', description: 'Por que não colocar todos os ovos na mesma cesta.', category: 'intermediate', readingTimeMin: 8, content: 'Diversificação reduz o risco da carteira distribuindo investimentos entre diferentes classes de ativos, setores e geografias. A correlação entre ativos é fundamental — ativos com correlação negativa protegem a carteira em momentos de estresse. Uma carteira diversificada pode ter renda fixa, ações, FIIs, cripto e ativos internacionais.' },
  { id: 'l5', emoji: '\uD83E\uDDEE', title: 'Imposto de Renda em Investimentos', description: 'Entenda a tributação de cada tipo de ativo.', category: 'intermediate', readingTimeMin: 10, content: 'Cada classe de ativo tem regras diferentes de IR. Ações: isenção até R$ 20k/mês em vendas, alíquota de 15% sobre ganho (20% para day trade). FIIs: rendimentos isentos, ganho de capital 20%. Renda fixa: tabela regressiva de 22,5% a 15%. Cripto: 15% sobre ganhos acima de R$ 35k/mês. Compense prejuízos para pagar menos imposto.' },
  { id: 'l6', emoji: '\uD83D\uDD25', title: 'FIRE - Independência Financeira', description: 'O movimento para aposentar cedo.', category: 'advanced', readingTimeMin: 9, content: 'FIRE (Financial Independence, Retire Early) é o movimento de acumular patrimônio suficiente para viver de renda passiva. A regra dos 4% sugere que você precisa de 25x suas despesas anuais. Para despesas de R$ 12.000/mês, o número FIRE é R$ 3.600.000. Estratégias incluem aumentar renda, reduzir gastos e investir a diferença.' },
  { id: 'l7', emoji: '\uD83C\uDF0D', title: 'Investimentos Internacionais', description: 'Como e por que investir fora do Brasil.', category: 'advanced', readingTimeMin: 8, content: 'Investir internacionalmente protege contra risco-país e dá acesso a empresas globais. Opções incluem BDRs na B3, ETFs internacionais (IVVB11, NASD11), ou conta em corretora no exterior. Considere a exposição cambial e tributação específica. Recomenda-se 10-30% do portfólio em ativos internacionais.' },
];

export const demoGlossary: GlossaryTerm[] = [
  { term: 'CDI', definition: 'Certificado de Depósito Interbancário. Taxa de referência para investimentos de renda fixa no Brasil.' },
  { term: 'Selic', definition: 'Taxa básica de juros da economia brasileira, definida pelo COPOM a cada 45 dias.' },
  { term: 'IPCA', definition: 'Índice de Preços ao Consumidor Amplo. Principal indicador de inflação do Brasil.' },
  { term: 'Dividend Yield', definition: 'Percentual de dividendos pagos em relação ao preço da ação nos últimos 12 meses.' },
  { term: 'P/L', definition: 'Preço/Lucro. Indica quantos anos de lucro atual seriam necessários para pagar o preço da ação.' },
  { term: 'Sharpe', definition: 'Índice que mede o retorno ajustado ao risco. Quanto maior, melhor a relação risco-retorno.' },
  { term: 'Drawdown', definition: 'Queda percentual máxima do valor de um investimento desde seu pico até o vale.' },
  { term: 'FIRE', definition: 'Financial Independence, Retire Early. Movimento de independência financeira e aposentadoria antecipada.' },
  { term: 'Volatilidade', definition: 'Medida estatística da dispersão dos retornos. Alta volatilidade = maior risco e potencial de ganho.' },
  { term: 'Beta', definition: 'Medida de sensibilidade de um ativo em relação ao mercado. Beta > 1 indica mais volátil que o mercado.' },
  { term: 'Alocação de Ativos', definition: 'Distribuição do patrimônio entre diferentes classes de investimento para otimizar risco-retorno.' },
  { term: 'Rebalanceamento', definition: 'Processo de ajustar a carteira de volta às proporções-alvo quando a alocação se desvia.' },
];

export const demoLearnProgress: LearnProgress = {
  completedIds: ['l1', 'l2', 'l3'],
  streak: 5,
  lastCompletedDate: '2026-02-22',
};

// =============================================================================
// Crypto Tracker
// =============================================================================

export const demoCryptoPortfolio: CryptoPortfolio = {
  totalValue: 48750,
  totalInvested: 38200,
  totalProfit: 10550,
  change24h: 2.34,
  change7d: -1.12,
  change30d: 8.56,
  fearGreedIndex: 62,
  holdings: [
    {
      id: 'c1', symbol: 'BTC', name: 'Bitcoin', quantity: 0.085,
      avgPrice: 320000, currentPrice: 385000, currentValue: 32725,
      change24h: 1.8, change7d: -0.5, change30d: 12.3,
      sparkline: [375000, 378000, 372000, 380000, 376000, 382000, 385000],
      color: '#F7931A', icon: '\u20BF',
    },
    {
      id: 'c2', symbol: 'ETH', name: 'Ethereum', quantity: 1.5,
      avgPrice: 6500, currentPrice: 7200, currentValue: 10800,
      change24h: 3.2, change7d: -2.1, change30d: 5.8,
      sparkline: [7050, 7100, 6980, 7150, 7080, 7180, 7200],
      color: '#627EEA', icon: '\u039E',
    },
    {
      id: 'c3', symbol: 'SOL', name: 'Solana', quantity: 8,
      avgPrice: 520, currentPrice: 653, currentValue: 5225,
      change24h: 4.1, change7d: 1.3, change30d: 9.2,
      sparkline: [620, 635, 628, 640, 645, 650, 653],
      color: '#9945FF', icon: '\u25CE',
    },
  ],
  dominance: [
    { symbol: 'BTC', percentage: 67.1, color: '#F7931A' },
    { symbol: 'ETH', percentage: 22.2, color: '#627EEA' },
    { symbol: 'SOL', percentage: 10.7, color: '#9945FF' },
  ],
};

// =============================================================================
// Subscriptions
// =============================================================================

export const demoSubscriptions: Subscription[] = [
  { id: 'sub1', name: 'Netflix', amount: 55.90, billing: 'monthly', category: 'entertainment', status: 'active', nextBilling: '2026-03-15', icon: '\uD83C\uDFAC', color: '#E50914', createdAt: '2023-05-01' },
  { id: 'sub2', name: 'Spotify', amount: 34.90, billing: 'monthly', category: 'entertainment', status: 'active', nextBilling: '2026-03-10', icon: '\uD83C\uDFB5', color: '#1DB954', createdAt: '2022-08-15' },
  { id: 'sub3', name: 'iCloud 200GB', amount: 14.90, billing: 'monthly', category: 'cloud', status: 'active', nextBilling: '2026-03-05', icon: '\u2601\uFE0F', color: '#007AFF', createdAt: '2024-01-10' },
  { id: 'sub4', name: 'ChatGPT Plus', amount: 104.90, billing: 'monthly', category: 'productivity', status: 'active', nextBilling: '2026-03-20', icon: '\uD83E\uDD16', color: '#10A37F', createdAt: '2024-06-01' },
  { id: 'sub5', name: 'Academia SmartFit', amount: 109.90, billing: 'monthly', category: 'health', status: 'active', nextBilling: '2026-03-01', icon: '\uD83C\uDFCB\uFE0F', color: '#FFD700', createdAt: '2024-03-01' },
  { id: 'sub6', name: 'Disney+', amount: 33.90, billing: 'monthly', category: 'entertainment', status: 'cancelled', nextBilling: '2026-02-28', icon: '\uD83C\uDFF0', color: '#113CCF', createdAt: '2023-11-01' },
  { id: 'sub7', name: 'Notion', amount: 48, billing: 'monthly', category: 'productivity', status: 'active', nextBilling: '2026-03-12', icon: '\uD83D\uDCDD', color: '#000000', createdAt: '2025-01-15' },
];

// =============================================================================
// Real Estate
// =============================================================================

export const demoRealEstateParams: RealEstateParams = {
  propertyValue: 600000,
  downPaymentPct: 20,
  annualRate: 10.5,
  termYears: 30,
  rentValue: 2800,
  annualRentIncrease: 5,
  appreciationRate: 4,
  investmentReturn: 11,
};

// =============================================================================
// Savings Challenges
// =============================================================================

export const demoSavingsChallenges: SavingsChallenge[] = [
  {
    id: 'ch1', name: 'Desafio 52 Semanas', type: '52week', status: 'active',
    targetAmount: 1378, currentAmount: 465, startDate: '2026-01-06', endDate: '2027-01-04',
    emoji: '\uD83D\uDCB0', color: '#00D4AA',
    checkedItems: [1,2,3,4,5,6,7,8], totalItems: 52, createdAt: '2026-01-06',
  },
  {
    id: 'ch2', name: 'Mês Sem Gastos', type: 'noSpend', status: 'active',
    targetAmount: 3000, currentAmount: 1200, startDate: '2026-02-01', endDate: '2026-02-28',
    emoji: '\uD83D\uDEAB', color: '#FF6B6B',
    checkedItems: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23], totalItems: 28, createdAt: '2026-02-01',
  },
  {
    id: 'ch3', name: 'Arredondamento', type: 'roundUp', status: 'active',
    targetAmount: 500, currentAmount: 187.50, startDate: '2026-01-15', endDate: '2026-07-15',
    emoji: '\uD83D\uDD1D', color: '#3A86FF',
    checkedItems: [1,2,3,4,5,6,7,8,9,10,11,12], totalItems: 26, createdAt: '2026-01-15',
  },
];

// =============================================================================
// FIRE
// =============================================================================

export const demoFIREParams: FIREParams = {
  currentAge: 32,
  annualIncome: 240000,
  annualExpenses: 120000,
  currentNetWorth: 847350,
  expectedReturn: 10,
  inflation: 5,
  safeWithdrawalRate: 4,
};

// =============================================================================
// Investment Diary
// =============================================================================

export const demoDiaryEntries: DiaryEntry[] = [
  {
    id: 'diary-1',
    title: 'Aumentei posição em PETR4',
    content: 'Petrobras apresentou resultados trimestrais fortes. Dividend yield atrativo acima de 12%. Comprei mais 100 ações a R$38.50.',
    mood: 'confident',
    tags: ['stock'],
    ticker: 'PETR4',
    decision: 'buy',
    createdAt: '2026-02-20T10:30:00',
    updatedAt: '2026-02-20T10:30:00',
  },
  {
    id: 'diary-2',
    title: 'Reduzindo exposição em cripto',
    content: 'Mercado cripto muito volátil. Realizei lucro de 15% em Solana. Manter apenas BTC e ETH por enquanto.',
    mood: 'anxious',
    tags: ['crypto'],
    ticker: 'SOL',
    decision: 'sell',
    createdAt: '2026-02-18T14:20:00',
    updatedAt: '2026-02-18T14:20:00',
  },
  {
    id: 'diary-3',
    title: 'Análise macro - Selic em queda',
    content: 'COPOM sinalizou corte de 0.5pp na próxima reunião. Bom momento para pré-fixados e ações de crescimento. Monitorar FIIs também.',
    mood: 'focused',
    tags: ['macro'],
    createdAt: '2026-02-15T09:00:00',
    updatedAt: '2026-02-15T09:00:00',
  },
  {
    id: 'diary-4',
    title: 'Rebalanceamento trimestral',
    content: 'Carteira desbalanceou: ações subiram para 45% (meta 35%). Vendendo parte para alocar em renda fixa e internacional.',
    mood: 'calm',
    tags: ['rebalance'],
    decision: 'sell',
    createdAt: '2026-02-10T16:00:00',
    updatedAt: '2026-02-10T16:00:00',
  },
  {
    id: 'diary-5',
    title: 'Novo fundo multimercado',
    content: 'Comecei a investir no fundo Verde FIC FIM. Gestão reconhecida, bom track record de longo prazo. Aporte inicial de R$10.000.',
    mood: 'uncertain',
    tags: ['fund'],
    decision: 'buy',
    createdAt: '2026-02-05T11:45:00',
    updatedAt: '2026-02-05T11:45:00',
  },
];

// =============================================================================
// Compound Interest
// =============================================================================

export const demoCompoundParams: CompoundParams = {
  initialAmount: 10000,
  monthlyContribution: 2000,
  annualRate: 12,
  years: 20,
  inflationAdjust: true,
  inflationRate: 5,
};

// =============================================================================
// Emergency Fund
// =============================================================================

export const demoEmergencyFund: EmergencyFundData = {
  currentAmount: 42000,
  monthlyExpenses: 8500,
  targetMonths: 6,
  contributions: [
    { date: '2026-01-15', amount: 5000 },
    { date: '2026-01-30', amount: 3000 },
    { date: '2026-02-15', amount: 4000 },
  ],
};

// =============================================================================
// Financial Calendar
// =============================================================================

export const demoFinancialEvents: FinancialEvent[] = [
  { id: 'fe-1', title: 'PETR4 - Dividendo', date: '2026-02-25', amount: 1250, type: 'dividend', color: '#00D4AA' },
  { id: 'fe-2', title: 'HGLG11 - Rendimento', date: '2026-02-15', amount: 890, type: 'dividend', color: '#00D4AA' },
  { id: 'fe-3', title: 'Aluguel', date: '2026-02-05', amount: 2800, type: 'bill', color: '#FF6B6B' },
  { id: 'fe-4', title: 'Internet + TV', date: '2026-02-10', amount: 249, type: 'bill', color: '#FF6B6B' },
  { id: 'fe-5', title: 'DARF - Ganho de Capital', date: '2026-02-28', amount: 1430, type: 'tax_deadline', color: '#FFB347' },
  { id: 'fe-6', title: 'Meta Viagem - Prazo', date: '2026-03-15', amount: 15000, type: 'goal_deadline', color: '#3A86FF' },
  { id: 'fe-7', title: 'VALE3 - Dividendo', date: '2026-03-10', amount: 2100, type: 'dividend', color: '#00D4AA' },
  { id: 'fe-8', title: 'IPTU Parcela 3', date: '2026-03-05', amount: 450, type: 'tax_deadline', color: '#FFB347' },
  { id: 'fe-9', title: 'Seguro do Carro', date: '2026-03-20', amount: 3200, type: 'bill', color: '#FF6B6B' },
  { id: 'fe-10', title: 'IRPF - Prazo Final', date: '2026-04-30', amount: 0, type: 'tax_deadline', color: '#FFB347' },
  { id: 'fe-11', title: 'Aniversário Casamento', date: '2026-03-25', amount: 2000, type: 'custom', color: '#A855F7' },
  { id: 'fe-12', title: 'Condomínio', date: '2026-02-07', amount: 980, type: 'bill', color: '#FF6B6B' },
];
