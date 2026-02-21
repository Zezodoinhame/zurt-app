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
  selectedTimeRange: '1A',
  selectedAssetClass: null,

  loadPortfolio: async () => {
    set({ isLoading: true });

    try {
      // Fetch dashboard summary and investments in parallel
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
      });
    } catch {
      // Both calls have their own fallback, but just in case
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });

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
      });
    } catch {
      set({ isRefreshing: false });
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
