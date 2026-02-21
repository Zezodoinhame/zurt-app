import { create } from 'zustand';
import type {
  PortfolioSummary,
  Institution,
  Asset,
  Allocation,
  AssetClass,
  Insight,
} from '../types';
import { fetchDashboardSummary, fetchInvestments } from '../services/api';

type TimeRange = '1M' | '3M' | '6M' | '1A' | 'MAX';

interface PortfolioState {
  summary: PortfolioSummary | null;
  institutions: Institution[];
  assets: Asset[];
  allocations: Allocation[];
  insights: Insight[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  selectedTimeRange: TimeRange;
  selectedAssetClass: AssetClass | null;

  loadPortfolio: () => Promise<void>;
  refresh: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  setSelectedAssetClass: (assetClass: AssetClass | null) => void;
  getAssetsByClass: (assetClass: AssetClass) => Asset[];
  getAssetsByInstitution: (institutionId: string) => Asset[];
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  summary: null,
  institutions: [],
  assets: [],
  allocations: [],
  insights: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  selectedTimeRange: '1A',
  selectedAssetClass: null,

  loadPortfolio: async () => {
    set({ isLoading: true, error: null });

    try {
      const [dashboardData, investmentData] = await Promise.all([
        fetchDashboardSummary(),
        fetchInvestments(),
      ]);

      set({
        summary: dashboardData.summary,
        institutions: investmentData.institutions,
        assets: investmentData.assets,
        allocations: investmentData.allocations,
        insights: dashboardData.insights,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message ?? 'Erro ao carregar portfolio',
      });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true, error: null });

    try {
      const [dashboardData, investmentData] = await Promise.all([
        fetchDashboardSummary(),
        fetchInvestments(),
      ]);

      set({
        summary: dashboardData.summary,
        institutions: investmentData.institutions,
        assets: investmentData.assets,
        allocations: investmentData.allocations,
        insights: dashboardData.insights,
        isRefreshing: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isRefreshing: false,
        error: err?.message ?? 'Erro ao atualizar portfolio',
      });
    }
  },

  setTimeRange: (range: TimeRange) => set({ selectedTimeRange: range }),

  setSelectedAssetClass: (assetClass: AssetClass | null) =>
    set({ selectedAssetClass: assetClass }),

  getAssetsByClass: (assetClass: AssetClass) =>
    get().assets.filter((a) => a.class === assetClass),

  getAssetsByInstitution: (institutionId: string) =>
    get().assets.filter((a) => a.institution === institutionId),
}));
