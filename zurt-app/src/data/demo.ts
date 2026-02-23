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
