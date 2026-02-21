import { create } from 'zustand';
import { fetchAIInsights, sendAIChat } from '../services/api';

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

  loadInitialInsights: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  reset: () => void;
}

let _msgCounter = 0;
function nextId() {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  conversationId: null,
  isLoading: false,
  error: null,
  rateLimited: false,

  loadInitialInsights: async () => {
    if (get().messages.length > 0) return; // Already loaded
    set({ isLoading: true, error: null });

    try {
      const data = await fetchAIInsights();
      set({
        messages: [
          {
            id: nextId(),
            role: 'assistant',
            content: data.message,
            suggestions: data.suggestions,
            timestamp: Date.now(),
          },
        ],
        isLoading: false,
      });
    } catch (err: any) {
      const isRateLimit = err?.message?.includes('429') || err?.message?.toLowerCase().includes('limit');
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
    set((s) => ({
      messages: [...s.messages, userMsg],
      isLoading: true,
      error: null,
    }));

    try {
      const data = await sendAIChat(message, conversationId ?? undefined);
      const aiMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: data.message,
        suggestions: data.suggestions,
        timestamp: Date.now(),
      };
      set((s) => ({
        messages: [...s.messages, aiMsg],
        conversationId: data.conversationId ?? s.conversationId,
        isLoading: false,
      }));
    } catch (err: any) {
      const isRateLimit = err?.message?.includes('429') || err?.message?.toLowerCase().includes('limit');
      set({
        isLoading: false,
        error: isRateLimit ? null : (err?.message ?? 'Erro ao enviar mensagem'),
        rateLimited: isRateLimit,
      });
    }
  },

  reset: () => {
    set({
      messages: [],
      conversationId: null,
      isLoading: false,
      error: null,
      rateLimited: false,
    });
  },
}));
