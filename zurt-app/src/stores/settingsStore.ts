import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Appearance } from 'react-native';
import { translations } from '../i18n/translations';
import type { Language } from '../i18n/translations';
import { darkColors, lightColors, type ThemeColors } from '../theme/colors';

export type Currency = 'BRL' | 'USD' | 'EUR';
export type ThemeMode = 'dark' | 'light' | 'system';

interface SettingsState {
  language: Language;
  currency: Currency;
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  t: (key: string) => string;
}

const LANGUAGE_KEY = 'zurt:language';
const CURRENCY_KEY = 'zurt:currency';
const THEME_KEY = '@zurt:theme';

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

function resolveColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'pt',
  currency: 'BRL',
  theme: 'dark',
  isDark: true,
  colors: darkColors,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const [lang, curr, themeStr] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(CURRENCY_KEY),
        AsyncStorage.getItem(THEME_KEY),
      ]);
      const language = (lang as Language) || 'pt';
      const currency = (curr as Currency) || 'BRL';
      const theme = (themeStr as ThemeMode) || 'dark';
      const isDark = resolveIsDark(theme);

      // Handle RTL for Arabic
      if (language === 'ar' && !I18nManager.isRTL) {
        I18nManager.forceRTL(true);
      } else if (language !== 'ar' && I18nManager.isRTL) {
        I18nManager.forceRTL(false);
      }

      set({ language, currency, theme, isDark, colors: resolveColors(isDark), isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }

    // Listen for system theme changes
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      const { theme } = get();
      if (theme === 'system') {
        const isDark = colorScheme !== 'light';
        set({ isDark, colors: resolveColors(isDark) });
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
    const isDark = resolveIsDark(theme);
    set({ theme, isDark, colors: resolveColors(isDark) });
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  },

  t: (key: string) => {
    const { language } = get();
    return translations[language]?.[key] ?? translations.pt[key] ?? key;
  },
}));
