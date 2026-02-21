import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { translations } from '../i18n/translations';
import type { Language } from '../i18n/translations';

export type Currency = 'BRL' | 'USD' | 'EUR';

interface SettingsState {
  language: Language;
  currency: Currency;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  t: (key: string) => string;
}

const LANGUAGE_KEY = 'zurt:language';
const CURRENCY_KEY = 'zurt:currency';

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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'pt',
  currency: 'BRL',
  isLoaded: false,

  loadSettings: async () => {
    try {
      const [lang, curr] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(CURRENCY_KEY),
      ]);
      const language = (lang as Language) || 'pt';
      const currency = (curr as Currency) || 'BRL';

      // Handle RTL for Arabic
      if (language === 'ar' && !I18nManager.isRTL) {
        I18nManager.forceRTL(true);
      } else if (language !== 'ar' && I18nManager.isRTL) {
        I18nManager.forceRTL(false);
      }

      set({ language, currency, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
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

  t: (key: string) => {
    const { language } = get();
    return translations[language]?.[key] ?? translations.pt[key] ?? key;
  },
}));
