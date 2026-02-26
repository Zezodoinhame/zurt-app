import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAIInsights, sendAIChat, isDemoMode } from '../services/api';
import { useSettingsStore } from './settingsStore';
import { useMarketStore } from './marketStore';
import { logger } from '../utils/logger';

const STORAGE_KEY = '@zurt:agent_messages';
const MAX_MESSAGES = 50;

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  suggestions?: string[];
  timestamp: number;
}

interface AgentState {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  rateLimited: boolean;
  _initialized: boolean;

  loadInitialInsights: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  reset: () => void;
}

let _msgCounter = 0;
function nextId() {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

function buildMarketContext(): string {
  const { ibovespa, currencies, selic, cryptos } = useMarketStore.getState();
  const parts: string[] = [];

  if (ibovespa) {
    const chg = ibovespa.regularMarketChangePercent;
    parts.push(`IBOV: ${ibovespa.regularMarketPrice?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${chg >= 0 ? '+' : ''}${chg?.toFixed(2)}%)`);
  }

  const usd = currencies.find((c) => c.fromCurrency === 'USD');
  if (usd) parts.push(`USD/BRL: R$ ${Number(usd.bidPrice).toFixed(2)}`);

  const eur = currencies.find((c) => c.fromCurrency === 'EUR');
  if (eur) parts.push(`EUR/BRL: R$ ${Number(eur.bidPrice).toFixed(2)}`);

  if (selic.length > 0) parts.push(`SELIC: ${Number(selic[0].value).toFixed(2)}%`);

  const btc = cryptos.find((c) => c.coin === 'BTC');
  if (btc) parts.push(`BTC: R$ ${btc.regularMarketPrice?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`);

  if (parts.length === 0) return '';
  return `[Dados de mercado atuais: ${parts.join(' | ')}]\n\n`;
}

async function persistMessages(messages: ChatMessage[]) {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore write errors
  }
}

async function loadPersistedMessages(): Promise<ChatMessage[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  conversationId: null,
  isLoading: false,
  error: null,
  rateLimited: false,
  _initialized: false,

  loadInitialInsights: async () => {
    logger.log('[AGENT] loadInitialInsights called, demoMode:', isDemoMode(), 'initialized:', get()._initialized);
    if (get()._initialized) return;
    set({ _initialized: true });

    // Try to restore persisted messages
    const saved = await loadPersistedMessages();
    if (saved && saved.length > 0) {
      logger.log('[AGENT] loadInitialInsights: restored', saved.length, 'persisted messages');
      set({ messages: saved });
      return; // User has history, don't auto-fetch
    }

    // No history — fetch initial insights
    logger.log('[AGENT] loadInitialInsights: no history, fetching insights...');
    set({ isLoading: true, error: null });

    try {
      const { language } = useSettingsStore.getState();
      logger.log('[AGENT] loadInitialInsights: calling fetchAIInsights, language:', language);
      const data = await fetchAIInsights(undefined, language);
      logger.log('[AGENT] loadInitialInsights: got response, length:', data?.message?.length);
      const msgs: ChatMessage[] = [
        {
          id: nextId(),
          role: 'assistant',
          content: data.message,
          suggestions: data.suggestions,
          timestamp: Date.now(),
        },
      ];
      set({ messages: msgs, isLoading: false });
      await persistMessages(msgs);
    } catch (err: any) {
      logger.log('[AGENT] loadInitialInsights ERROR:', err?.message, err?.name, JSON.stringify(err).substring(0, 200));
      const isAbort = err?.name === 'AbortError';
      const isRateLimit =
        err?.message?.includes('429') || err?.message?.toLowerCase().includes('limit');
      set({
        isLoading: false,
        error: isRateLimit ? null : isAbort ? 'Timeout na conexão. Tente novamente.' : (err?.message ?? 'Erro ao carregar insights'),
        rateLimited: isRateLimit,
      });
    }
  },

  sendMessage: async (message: string) => {
    logger.log('[AGENT] sendMessage called, demoMode:', isDemoMode(), 'message:', message.substring(0, 60));
    const { conversationId } = get();

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    const withUser = [...get().messages, userMsg].slice(-MAX_MESSAGES);
    set({ messages: withUser, isLoading: true, error: null });
    await persistMessages(withUser);

    try {
      const { language } = useSettingsStore.getState();
      const marketCtx = buildMarketContext();
      const enrichedMessage = marketCtx ? `${marketCtx}${message}` : message;
      logger.log('[AGENT] sendMessage: calling sendAIChat, language:', language, 'marketCtx:', marketCtx.length > 0);
      const data = await sendAIChat(enrichedMessage, conversationId ?? undefined, language);
      logger.log('[AGENT] sendMessage: got response, length:', data?.message?.length);
      const aiMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: data.message,
        suggestions: data.suggestions,
        timestamp: Date.now(),
      };
      const updated = [...get().messages, aiMsg].slice(-MAX_MESSAGES);
      set({
        messages: updated,
        conversationId: data.conversationId ?? get().conversationId,
        isLoading: false,
      });
      await persistMessages(updated);
    } catch (err: any) {
      logger.log('[AGENT] sendMessage ERROR:', err?.message, err?.name, JSON.stringify(err).substring(0, 200));
      const isAbort = err?.name === 'AbortError';
      const isRateLimit =
        err?.message?.includes('429') || err?.message?.toLowerCase().includes('limit');
      set({
        isLoading: false,
        error: isRateLimit ? null : isAbort ? 'Timeout na conexão. Tente novamente.' : (err?.message ?? 'Erro ao enviar mensagem'),
        rateLimited: isRateLimit,
      });
    }
  },

  clearHistory: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    set({
      messages: [],
      conversationId: null,
      isLoading: false,
      error: null,
      rateLimited: false,
      _initialized: false,
    });
  },

  reset: () => {
    set({
      messages: [],
      conversationId: null,
      isLoading: false,
      error: null,
      rateLimited: false,
      _initialized: false,
    });
  },
}));
