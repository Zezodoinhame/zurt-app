import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAIInsights, sendAIChat } from '../services/api';
import { useSettingsStore } from './settingsStore';

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
    if (get()._initialized) return;
    set({ _initialized: true });

    // Try to restore persisted messages
    const saved = await loadPersistedMessages();
    if (saved && saved.length > 0) {
      set({ messages: saved });
      return; // User has history, don't auto-fetch
    }

    // No history — fetch initial insights
    set({ isLoading: true, error: null });

    try {
      const { language } = useSettingsStore.getState();
      const data = await fetchAIInsights(undefined, language);
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
      const isRateLimit =
        err?.message?.includes('429') || err?.message?.toLowerCase().includes('limit');
      set({
        isLoading: false,
        error: isRateLimit ? null : (err?.message ?? 'Erro ao carregar insights'),
        rateLimited: isRateLimit,
      });
    }
  },

  sendMessage: async (message: string) => {
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
      const data = await sendAIChat(message, conversationId ?? undefined, language);
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
      const isRateLimit =
        err?.message?.includes('429') || err?.message?.toLowerCase().includes('limit');
      set({
        isLoading: false,
        error: isRateLimit ? null : (err?.message ?? 'Erro ao enviar mensagem'),
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
