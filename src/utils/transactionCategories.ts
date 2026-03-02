export interface CategoryInfo {
  emoji: string;
  label: string;
  color: string;
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  // Alimentacao
  ifood: { emoji: '\u{1F355}', label: 'Alimentacao', color: '#FF6B6B' },
  'uber eats': { emoji: '\u{1F354}', label: 'Delivery', color: '#FF6B6B' },
  rappi: { emoji: '\u{1F371}', label: 'Delivery', color: '#FF6B6B' },
  restaurante: { emoji: '\u{1F37D}\uFE0F', label: 'Restaurante', color: '#FF6B6B' },
  padaria: { emoji: '\u{1F950}', label: 'Padaria', color: '#FF6B6B' },
  mercado: { emoji: '\u{1F6D2}', label: 'Mercado', color: '#4ECDC4' },
  supermercado: { emoji: '\u{1F6D2}', label: 'Mercado', color: '#4ECDC4' },
  carrefour: { emoji: '\u{1F6D2}', label: 'Mercado', color: '#4ECDC4' },

  // Transporte
  uber: { emoji: '\u{1F697}', label: 'Transporte', color: '#45B7D1' },
  '99': { emoji: '\u{1F695}', label: 'Transporte', color: '#45B7D1' },
  posto: { emoji: '\u26FD', label: 'Combustivel', color: '#45B7D1' },
  shell: { emoji: '\u26FD', label: 'Combustivel', color: '#45B7D1' },
  gasolina: { emoji: '\u26FD', label: 'Combustivel', color: '#45B7D1' },
  estacionamento: { emoji: '\u{1F17F}\uFE0F', label: 'Estacionamento', color: '#45B7D1' },

  // Entretenimento
  netflix: { emoji: '\u{1F37F}', label: 'Streaming', color: '#E74C3C' },
  spotify: { emoji: '\u{1F3B5}', label: 'Streaming', color: '#1DB954' },
  'amazon prime': { emoji: '\u{1F4E6}', label: 'Streaming', color: '#FF9900' },
  disney: { emoji: '\u{1F3F0}', label: 'Streaming', color: '#113CCF' },
  youtube: { emoji: '\u25B6\uFE0F', label: 'Streaming', color: '#FF0000' },
  hbo: { emoji: '\u{1F3AC}', label: 'Streaming', color: '#B535F6' },
  cinema: { emoji: '\u{1F3AC}', label: 'Cinema', color: '#9B59B6' },

  // Saude
  farmacia: { emoji: '\u{1F48A}', label: 'Farmacia', color: '#2ECC71' },
  drogaria: { emoji: '\u{1F48A}', label: 'Farmacia', color: '#2ECC71' },
  drogasil: { emoji: '\u{1F48A}', label: 'Farmacia', color: '#2ECC71' },
  hospital: { emoji: '\u{1F3E5}', label: 'Saude', color: '#2ECC71' },
  medico: { emoji: '\u2695\uFE0F', label: 'Saude', color: '#2ECC71' },

  // Compras
  amazon: { emoji: '\u{1F4E6}', label: 'Compras Online', color: '#FF9900' },
  'mercado livre': { emoji: '\u{1F4E6}', label: 'Compras Online', color: '#FFE600' },
  shopee: { emoji: '\u{1F6CD}\uFE0F', label: 'Compras Online', color: '#EE4D2D' },
  magazine: { emoji: '\u{1F6CD}\uFE0F', label: 'Loja', color: '#0086FF' },
  renner: { emoji: '\u{1F455}', label: 'Vestuario', color: '#E91E63' },
  zara: { emoji: '\u{1F457}', label: 'Vestuario', color: '#E91E63' },

  // Moradia
  aluguel: { emoji: '\u{1F3E0}', label: 'Moradia', color: '#8E44AD' },
  condominio: { emoji: '\u{1F3E2}', label: 'Condominio', color: '#8E44AD' },
  energia: { emoji: '\u{1F4A1}', label: 'Energia', color: '#F1C40F' },
  luz: { emoji: '\u{1F4A1}', label: 'Energia', color: '#F1C40F' },
  agua: { emoji: '\u{1F4A7}', label: 'Agua', color: '#3498DB' },
  internet: { emoji: '\u{1F4E1}', label: 'Internet', color: '#3498DB' },
  telefone: { emoji: '\u{1F4F1}', label: 'Telefone', color: '#3498DB' },
  claro: { emoji: '\u{1F4F1}', label: 'Telefone', color: '#E74C3C' },
  vivo: { emoji: '\u{1F4F1}', label: 'Telefone', color: '#660099' },
  tim: { emoji: '\u{1F4F1}', label: 'Telefone', color: '#003399' },

  // Financeiro
  anuidade: { emoji: '\u{1F4B3}', label: 'Anuidade', color: '#95A5A6' },
  seguro: { emoji: '\u{1F6E1}\uFE0F', label: 'Seguro', color: '#95A5A6' },
  iof: { emoji: '\u{1F3DB}\uFE0F', label: 'Imposto', color: '#95A5A6' },
  juros: { emoji: '\u{1F4C8}', label: 'Juros', color: '#E74C3C' },
  pix: { emoji: '\u26A1', label: 'PIX', color: '#00BDAE' },
  transferencia: { emoji: '\u2194\uFE0F', label: 'Transferencia', color: '#00BDAE' },
};

const DEFAULT_CATEGORY: CategoryInfo = { emoji: '\u{1F4B0}', label: 'Outros', color: '#95A5A6' };

export function categorizeTransaction(description: string): CategoryInfo {
  const lower = description.toLowerCase();
  for (const [keyword, info] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return info;
  }
  return DEFAULT_CATEGORY;
}
