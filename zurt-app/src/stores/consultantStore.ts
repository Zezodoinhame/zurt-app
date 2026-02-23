import { create } from 'zustand';
import type { ConsultantClient, ClientPortfolio } from '../types';
import { isDemoMode } from '../services/api';
import { demoConsultantClients, demoClientPortfolios } from '../data/demo';

interface ConsultantState {
  clients: ConsultantClient[];
  selectedClient: ConsultantClient | null;
  clientPortfolio: ClientPortfolio | null;
  isLoading: boolean;
  error: string | null;

  loadClients: () => Promise<void>;
  selectClient: (id: string) => Promise<void>;
  clearSelection: () => void;
}

export const useConsultantStore = create<ConsultantState>((set, get) => ({
  clients: [],
  selectedClient: null,
  clientPortfolio: null,
  isLoading: false,
  error: null,

  loadClients: async () => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode()) {
        set({ clients: demoConsultantClients, isLoading: false });
        return;
      }
      // Real API call would go here
      // const data = await apiRequest('/consultant/clients');
      set({ clients: demoConsultantClients, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading clients' });
    }
  },

  selectClient: async (id: string) => {
    const client = get().clients.find((c) => c.id === id) ?? null;
    set({ selectedClient: client, clientPortfolio: null, isLoading: true });
    try {
      if (isDemoMode()) {
        set({ clientPortfolio: demoClientPortfolios[id] ?? null, isLoading: false });
        return;
      }
      // Real API call would go here
      // const data = await apiRequest(`/consultant/clients/${id}/portfolio`);
      set({ clientPortfolio: demoClientPortfolios[id] ?? null, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading portfolio' });
    }
  },

  clearSelection: () => set({ selectedClient: null, clientPortfolio: null }),
}));
