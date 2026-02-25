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
  { nome: 'Alimentacao', valor: 3842.50, cor: '#FF6B6B', icone: 'restaurant-outline', pct: 0 },
  { nome: 'Transporte', valor: 2150.00, cor: '#4ECDC4', icone: 'car-outline', pct: 0 },
  { nome: 'Saude', valor: 1890.00, cor: '#45B7D1', icone: 'medkit-outline', pct: 0 },
  { nome: 'Educacao', valor: 1200.00, cor: '#96CEB4', icone: 'school-outline', pct: 0 },
  { nome: 'Lazer', valor: 980.00, cor: '#FFEAA7', icone: 'game-controller-outline', pct: 0 },
  { nome: 'Compras', valor: 3650.42, cor: '#DDA0DD', icone: 'bag-outline', pct: 0 },
  { nome: 'Outros', valor: 1091.00, cor: '#B0B0B0', icone: 'ellipsis-horizontal-outline', pct: 0 },
];

// Calcula percentuais
const totalSpending = DEMO_SPENDING.reduce((s, c) => s + c.valor, 0);
DEMO_SPENDING.forEach(c => { c.pct = c.valor / totalSpending; });

// ─── Adapter: Store CreditCard → Visual CreditCard ──────────

import type { CreditCard as StoreCreditCard, CategorySpending as StoreCategorySpending } from '../types';

const BANK_ABBREVS: Record<string, string> = {
  nubank: 'nu', btg: 'BTG', xp: 'XP', inter: 'inter', c6: 'C6',
  santander: 'SAN', 'itaú': 'Itaú', itau: 'Itaú', bradesco: 'BRA',
  'banco do brasil': 'BB', caixa: 'CEF', safra: 'SAF', modal: 'MOD',
  original: 'ORI', pan: 'PAN', next: 'NXT', neon: 'NEO', picpay: 'PIC',
};

const BANK_GRADIENTS: Record<string, [string, string, string]> = {
  nubank: ['#820AD1', '#5B0A91', '#3D0663'],
  btg: ['#1a1a1a', '#2a2a2a', '#1a1a1a'],
  xp: ['#1a1a1a', '#2d2d2d', '#1a1a1a'],
  inter: ['#FF7A00', '#E56B00', '#CC5F00'],
  c6: ['#0a0a0a', '#1a1a1a', '#252525'],
  santander: ['#EC0000', '#CC0000', '#990000'],
  itau: ['#003B71', '#00285A', '#001E45'],
  bradesco: ['#CC092F', '#AA0827', '#880620'],
  'banco do brasil': ['#FFC72C', '#DDC700', '#003882'],
  caixa: ['#005CA9', '#004A8A', '#003B71'],
  safra: ['#003366', '#002244', '#001133'],
  pan: ['#0066FF', '#0044CC', '#002299'],
  picpay: ['#21C25E', '#1AA84F', '#158D40'],
  neon: ['#0066FF', '#0044DD', '#0033BB'],
};

const CATEGORY_ICONS: Record<string, string> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  subscriptions: 'card-outline',
  shopping: 'bag-outline',
  fuel: 'speedometer-outline',
  health: 'medkit-outline',
  travel: 'airplane-outline',
  tech: 'laptop-outline',
};

function deriveBankKey(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(BANK_ABBREVS)) {
    if (lower.includes(key)) return key;
  }
  return '';
}

function deriveBankAbbrev(name: string): string {
  const key = deriveBankKey(name);
  if (key && BANK_ABBREVS[key]) return BANK_ABBREVS[key];
  return name.slice(0, 3).toUpperCase();
}

function deriveGradient(name: string, color: string, secondaryColor: string): [string, string, string] {
  const key = deriveBankKey(name);
  if (key && BANK_GRADIENTS[key]) return BANK_GRADIENTS[key];
  const c1 = color || '#1a1a1a';
  const c2 = secondaryColor || '#2a2a2a';
  return [c1, c2, c1];
}

function formatDateBR(isoDate: string): string {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function adaptStoreCard(card: StoreCreditCard): CreditCard {
  const brandLower = (card.brand || '').toLowerCase();
  const bandeira: 'visa' | 'mastercard' | 'elo' =
    brandLower.includes('visa') ? 'visa' :
    brandLower.includes('elo') ? 'elo' : 'mastercard';

  return {
    id: card.id,
    banco: card.name,
    bancoAbrev: deriveBankAbbrev(card.name),
    tipo: card.brand || '',
    bandeira,
    ultimos4: card.lastFour,
    limiteTotal: card.limit,
    limiteUsado: card.used,
    faturaAtual: card.currentInvoice,
    faturaStatus: 'aberta',
    vencimento: formatDateBR(card.dueDate),
    fechamento: formatDateBR(card.closingDate),
    gradientColors: deriveGradient(card.name, card.color, card.secondaryColor),
    textColor: '#FFFFFF',
    chipColor: 'rgba(255,215,0,0.4)',
    hasMetalTexture: false,
    hasCarbonTexture: false,
    hasContactless: true,
  };
}

export function adaptCategorySpending(spending: StoreCategorySpending[]): SpendingCategory[] {
  const total = spending.reduce((s, c) => s + c.total, 0);
  return spending
    .filter(c => c.total > 0)
    .map(c => ({
      nome: c.label,
      valor: c.total,
      cor: c.color || '#B0B0B0',
      icone: CATEGORY_ICONS[c.category] || 'ellipsis-horizontal-outline',
      pct: total > 0 ? c.total / total : 0,
    }));
}
