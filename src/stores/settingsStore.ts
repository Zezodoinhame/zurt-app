import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Appearance } from 'react-native';
import { translations } from '../i18n/translations';
import type { Language } from '../i18n/translations';
import { darkColors, lightColors, type ThemeColors } from '../theme/colors';

export type Currency = 'BRL' | 'USD' | 'EUR';
export type ThemeMode = 'dark' | 'light' | 'system';
export type IconStyle = 'icons' | 'emoji';

export type AccentColor = '#00D4AA' | '#3B82F6' | '#A855F7' | '#F59E0B' | '#EC4899' | '#06B6D4';

export const ACCENT_COLORS: { key: AccentColor; label: string }[] = [
  { key: '#00D4AA', label: 'profile.accentGreen' },
  { key: '#3B82F6', label: 'profile.accentBlue' },
  { key: '#A855F7', label: 'profile.accentPurple' },
  { key: '#F59E0B', label: 'profile.accentGold' },
  { key: '#EC4899', label: 'profile.accentPink' },
  { key: '#06B6D4', label: 'profile.accentCyan' },
];

interface SettingsState {
  language: Language;
  currency: Currency;
  theme: ThemeMode;
  iconStyle: IconStyle;
  accentColor: AccentColor;
  isDark: boolean;
  colors: ThemeColors;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setIconStyle: (style: IconStyle) => Promise<void>;
  setAccentColor: (color: AccentColor) => Promise<void>;
  t: (key: string) => string;
}

const LANGUAGE_KEY = 'zurt:language';
const CURRENCY_KEY = 'zurt:currency';
const THEME_KEY = '@zurt:theme';
const ICON_STYLE_KEY = '@zurt:iconStyle';
const ACCENT_COLOR_KEY = '@zurt:accentColor';

// Exchange rates (hardcoded for now)
export const exchangeRates: Record<Currency, number> = {
  BRL: 1,
  USD: 0.17, // 1 BRL ≈ 0.17 USD
  EUR: 0.16, // 1 BRL ≈ 0.16 EUR
};

export const currencySymbols: Record<Currency, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
};

export const currencyLocales: Record<Currency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
};

function resolveIsDark(theme: ThemeMode): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  // system
  return Appearance.getColorScheme() !== 'light';
}

function resolveColors(isDark: boolean, accent?: AccentColor): ThemeColors {
  const base = isDark ? darkColors : lightColors;
  if (!accent || accent === '#00D4AA') return base;
  // Derive a lighter "light" variant for the accent
  const accentLight = accent + '20';
  return {
    ...base,
    accent,
    accentLight,
    positive: accent,
    success: accent,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'pt',
  currency: 'BRL',
  theme: 'dark',
  iconStyle: 'icons',
  accentColor: '#00D4AA',
  isDark: true,
  colors: darkColors,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const [lang, curr, themeStr, iconStr, accentStr] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(CURRENCY_KEY),
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(ICON_STYLE_KEY),
        AsyncStorage.getItem(ACCENT_COLOR_KEY),
      ]);
      const language = (lang as Language) || 'pt';
      const currency = (curr as Currency) || 'BRL';
      const theme = (themeStr as ThemeMode) || 'dark';
      const iconStyle = (iconStr as IconStyle) || 'icons';
      const accentColor = (accentStr as AccentColor) || '#00D4AA';
      const isDark = resolveIsDark(theme);

      // Handle RTL for Arabic
      if (language === 'ar' && !I18nManager.isRTL) {
        I18nManager.forceRTL(true);
      } else if (language !== 'ar' && I18nManager.isRTL) {
        I18nManager.forceRTL(false);
      }

      set({ language, currency, theme, iconStyle, accentColor, isDark, colors: resolveColors(isDark, accentColor), isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }

    // Listen for system theme changes
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      const { theme, accentColor } = get();
      if (theme === 'system') {
        const isDark = colorScheme !== 'light';
        set({ isDark, colors: resolveColors(isDark, accentColor) });
      }
    });
    // Store cleanup function isn't needed — listener lives for app lifetime
  },

  setLanguage: async (language: Language) => {
    set({ language });
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      // Handle RTL for Arabic
      if (language === 'ar' && !I18nManager.isRTL) {
        I18nManager.forceRTL(true);
      } else if (language !== 'ar' && I18nManager.isRTL) {
        I18nManager.forceRTL(false);
      }
    } catch {
      // ignore
    }
  },

  setCurrency: async (currency: Currency) => {
    set({ currency });
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, currency);
    } catch {
      // ignore
    }
  },

  setTheme: async (theme: ThemeMode) => {
    const { accentColor } = get();
    const isDark = resolveIsDark(theme);
    set({ theme, isDark, colors: resolveColors(isDark, accentColor) });
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  },

  setIconStyle: async (iconStyle: IconStyle) => {
    set({ iconStyle });
    try {
      await AsyncStorage.setItem(ICON_STYLE_KEY, iconStyle);
    } catch {
      // ignore
    }
  },

  setAccentColor: async (accentColor: AccentColor) => {
    const { isDark } = get();
    set({ accentColor, colors: resolveColors(isDark, accentColor) });
    try {
      await AsyncStorage.setItem(ACCENT_COLOR_KEY, accentColor);
    } catch {
      // ignore
    }
  },

  t: (key: string) => {
    const { language } = get();
    return translations[language]?.[key] ?? translations.pt[key] ?? key;
  },
}));
