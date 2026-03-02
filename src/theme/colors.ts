// ===========================================================================
// ZURT Theme Colors — Dark & Light
// ===========================================================================

// Brand / semantic colors shared across themes
const sharedColors = {
  institutions: {
    nubank: '#8A05BE',
    itau: '#003399',
    bradesco: '#CC092F',
    btg: '#0D1B2A',
    xp: '#1A1A1A',
    inter: '#FF6600',
    c6: '#1A1A1A',
    rico: '#FF4500',
    clear: '#00A651',
    binance: '#F3BA2F',
  },
  categories: {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    subscriptions: '#A855F7',
    shopping: '#F472B6',
    fuel: '#FB923C',
    health: '#34D399',
    travel: '#60A5FA',
    tech: '#818CF8',
  },
  assetClasses: {
    fixedIncome: '#3A86FF',
    stocks: '#00D4AA',
    fiis: '#FFBE0B',
    crypto: '#F3BA2F',
    international: '#A855F7',
    pension: '#F472B6',
  },
} as const;

export const darkColors = {
  ...sharedColors,
  background: '#080D14',
  card: '#0D1520',
  cardAlt: '#111B2A',
  elevated: '#0F1820',
  input: '#121A24',
  border: '#1A2A3A',
  surface: '#0F1923',
  text: {
    primary: '#FFFFFF',
    secondary: '#A0AEC0',
    muted: '#64748B',
    inverse: '#080D14',
  },
  accent: '#00D4AA',
  accentLight: '#00D4AA20',
  positive: '#00D4AA',
  negative: '#FF6B6B',
  warning: '#FFD93D',
  success: '#00D4AA',
  info: '#3A86FF',
  tabBar: '#080D14',
  tabBarBorder: '#1A2A3A',
  statusBar: 'light' as const,
} as const;

export const lightColors = {
  ...sharedColors,
  background: '#F5F7FA',
  card: '#FFFFFF',
  cardAlt: '#F0F2F5',
  elevated: '#F0F2F5',
  input: '#FFFFFF',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  text: {
    primary: '#1A202C',
    secondary: '#4A5568',
    muted: '#718096',
    inverse: '#FFFFFF',
  },
  accent: '#00957A',
  accentLight: '#00957A20',
  positive: '#00957A',
  negative: '#E74C3C',
  warning: '#C47D0E',
  success: '#00957A',
  info: '#3A86FF',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  statusBar: 'dark' as const,
} as const;

export type ThemeColors = {
  institutions: typeof sharedColors['institutions'];
  categories: typeof sharedColors['categories'];
  assetClasses: typeof sharedColors['assetClasses'];
  background: string;
  card: string;
  cardAlt: string;
  elevated: string;
  input: string;
  border: string;
  surface: string;
  text: { primary: string; secondary: string; muted: string; inverse: string };
  accent: string;
  accentLight: string;
  positive: string;
  negative: string;
  warning: string;
  success: string;
  info: string;
  tabBar: string;
  tabBarBorder: string;
  statusBar: 'light' | 'dark';
};

// Backward-compatible default export (dark theme)
export const colors = darkColors;
export type Colors = ThemeColors;
