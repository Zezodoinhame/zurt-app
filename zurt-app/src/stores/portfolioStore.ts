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

      // Recompute institution assetCount and totalValue from actual assets
      const assets = investmentData.assets;
      const institutions = investmentData.institutions.map((inst) => {
        const instAssets = assets.filter((a) => a.institution === inst.id);
        return {
          ...inst,
          assetCount: instAssets.length > 0 ? instAssets.length : inst.assetCount,
          totalValue: instAssets.length > 0
            ? instAssets.reduce((sum, a) => sum + a.currentValue, 0)
            : inst.totalValue,
        };
      });

      // Recompute allocations from actual assets if needed
      const allocations = investmentData.allocations.map((alloc) => {
        const classAssets = assets.filter((a) => a.class === alloc.class);
        return {
          ...alloc,
          value: classAssets.length > 0
            ? classAssets.reduce((sum, a) => sum + a.currentValue, 0)
            : alloc.value,
        };
      });

      // Ensure summary totalValue matches sum of allocations
      const allocTotal = allocations.reduce((sum, a) => sum + a.value, 0);
      const summary = dashboardData.summary;
      if (summary && (summary.totalValue === 0 || !summary.totalValue) && allocTotal > 0) {
        summary.totalValue = allocTotal;
        summary.profit = allocTotal - (summary.investedValue || 0);
      }

      set({
        summary,
        institutions,
        assets,
        allocations,
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

      const assets = investmentData.assets;
      const institutions = investmentData.institutions.map((inst) => {
        const instAssets = assets.filter((a) => a.institution === inst.id);
        return {
          ...inst,
          assetCount: instAssets.length > 0 ? instAssets.length : inst.assetCount,
          totalValue: instAssets.length > 0
            ? instAssets.reduce((sum, a) => sum + a.currentValue, 0)
            : inst.totalValue,
        };
      });

      const allocations = investmentData.allocations.map((alloc) => {
        const classAssets = assets.filter((a) => a.class === alloc.class);
        return {
          ...alloc,
          value: classAssets.length > 0
            ? classAssets.reduce((sum, a) => sum + a.currentValue, 0)
            : alloc.value,
        };
      });

      const allocTotal = allocations.reduce((sum, a) => sum + a.value, 0);
      const summary = dashboardData.summary;
      if (summary && (summary.totalValue === 0 || !summary.totalValue) && allocTotal > 0) {
        summary.totalValue = allocTotal;
        summary.profit = allocTotal - (summary.investedValue || 0);
      }

      set({
        summary,
        institutions,
        assets,
        allocations,
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
