// data/cardsData.ts
// Dados demo dos cartões — substituir por dados reais da Pluggy/Open Finance

export interface CreditCard {
  id: string;
  banco: string;
  bancoAbrev: string;
  tipo: string;
  bandeira: 'visa' | 'mastercard' | 'elo';
  ultimos4: string;
  limiteTotal: number;
  limiteUsado: number;
  faturaAtual: number;
  faturaStatus: 'aberta' | 'fechada' | 'paga';
  vencimento: string;
  fechamento: string;
  // Visual
  gradientColors: [string, string, string];
  textColor: string;
  chipColor: string;
  hasMetalTexture: boolean;
  hasCarbonTexture: boolean;
  hasContactless: boolean;
  parceiro?: string;
}

export interface SpendingCategory {
  nome: string;
  valor: number;
  cor: string;
  icone: string;
  pct: number;
}

export const DEMO_CARDS: CreditCard[] = [
  {
    id: 'nu-ultra',
    banco: 'Nubank',
    bancoAbrev: 'nu',
    tipo: 'Ultravioleta',
    bandeira: 'mastercard',
    ultimos4: '8834',
    limiteTotal: 42000,
    limiteUsado: 12847.32,
    faturaAtual: 3421.15,
    faturaStatus: 'aberta',
    vencimento: '15/03/2026',
    fechamento: '08/03/2026',
    gradientColors: ['#820AD1', '#5B0A91', '#3D0663'],
    textColor: '#FFFFFF',
    chipColor: 'rgba(255,215,0,0.4)',
    hasMetalTexture: false,
    hasCarbonTexture: false,
    hasContactless: true,
  },
  {
    id: 'btg-black',
    banco: 'BTG Pactual',
    bancoAbrev: 'BTG',
    tipo: 'Black',
    bandeira: 'mastercard',
    ultimos4: '5521',
    limiteTotal: 120000,
    limiteUsado: 28350.00,
    faturaAtual: 15200.00,
    faturaStatus: 'fechada',
    vencimento: '20/03/2026',
    fechamento: '13/03/2026',
    gradientColors: ['#1a1a1a', '#2a2a2a', '#1a1a1a'],
    textColor: '#FFFFFF',
    chipColor: 'rgba(255,215,0,0.35)',
    hasMetalTexture: true,
    hasCarbonTexture: false,
    hasContactless: true,
  },
  {
    id: 'xp-infinite',
    banco: 'XP Investimentos',
    bancoAbrev: 'XP',
    tipo: 'Visa Infinite',
    bandeira: 'visa',
    ultimos4: '9917',
    limiteTotal: 85000,
    limiteUsado: 6230.00,
    faturaAtual: 6230.00,
    faturaStatus: 'aberta',
    vencimento: '10/03/2026',
    fechamento: '03/03/2026',
    gradientColors: ['#1a1a1a', '#2d2d2d', '#1a1a1a'],
    textColor: '#FFFFFF',
    chipColor: 'rgba(255,215,0,0.5)',
    hasMetalTexture: true,
    hasCarbonTexture: false,
    hasContactless: true,
  },
  {
    id: 'inter-black',
    banco: 'Inter',
    bancoAbrev: 'inter',
    tipo: 'Black',
    bandeira: 'mastercard',
    ultimos4: '2203',
    limiteTotal: 35000,
    limiteUsado: 1890.45,
    faturaAtual: 1890.45,
    faturaStatus: 'aberta',
    vencimento: '25/03/2026',
    fechamento: '18/03/2026',
    gradientColors: ['#FF7A00', '#E56B00', '#CC5F00'],
    textColor: '#FFFFFF',
    chipColor: 'rgba(255,255,255,0.3)',
    hasMetalTexture: false,
    hasCarbonTexture: false,
    hasContactless: true,
  },
  {
    id: 'c6-carbon',
    banco: 'C6 Bank',
    bancoAbrev: 'C6',
    tipo: 'Carbon Black',
    bandeira: 'mastercard',
    ultimos4: '7741',
    limiteTotal: 18000,
    limiteUsado: 4512.80,
    faturaAtual: 2100.00,
    faturaStatus: 'fechada',
    vencimento: '05/03/2026',
    fechamento: '28/02/2026',
    gradientColors: ['#0a0a0a', '#1a1a1a', '#252525'],
    textColor: '#d4d4d4',
    chipColor: 'rgba(180,160,120,0.45)',
    hasMetalTexture: false,
    hasCarbonTexture: true,
    hasContactless: true,
  },
  {
    id: 'san-aadvantage',
    banco: 'Santander',
    bancoAbrev: 'SAN',
    tipo: 'AAdvantage Black',
    bandeira: 'mastercard',
    ultimos4: '4410',
    limiteTotal: 55000,
    limiteUsado: 8320.00,
    faturaAtual: 8320.00,
    faturaStatus: 'aberta',
    vencimento: '18/03/2026',
    fechamento: '11/03/2026',
    gradientColors: ['#3a3a3a', '#4a4a4a', '#2a2a2a'],
    textColor: '#FFFFFF',
    chipColor: 'rgba(255,215,0,0.35)',
    hasMetalTexture: true,
    hasCarbonTexture: false,
    hasContactless: true,
    parceiro: 'American Airlines',
  },
];

export const DEMO_SPENDING: SpendingCategory[] = [
  { nome: 'Alimentação', valor: 3842.50, cor: '#FF6B6B', icone: 'restaurant-outline', pct: 0 },
  { nome: 'Transporte', valor: 2150.00, cor: '#4ECDC4', icone: 'car-outline', pct: 0 },
  { nome: 'Saúde', valor: 1890.00, cor: '#45B7D1', icone: 'medkit-outline', pct: 0 },
  { nome: 'Educação', valor: 1200.00, cor: '#96CEB4', icone: 'school-outline', pct: 0 },
  { nome: 'Lazer', valor: 980.00, cor: '#FFEAA7', icone: 'game-controller-outline', pct: 0 },
  { nome: 'Compras', valor: 3650.42, cor: '#DDA0DD', icone: 'bag-outline', pct: 0 },
  { nome: 'Outros', valor: 1091.00, cor: '#B0B0B0', icone: 'ellipsis-horizontal-outline', pct: 0 },
];

// Calcula percentuais
const totalSpending = DEMO_SPENDING.reduce((s, c) => s + c.valor, 0);
DEMO_SPENDING.forEach(c => { c.pct = c.valor / totalSpending; });
