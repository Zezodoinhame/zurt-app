import { create } from 'zustand';
import type {
  PortfolioSummary,
  Institution,
  Asset,
  Allocation,
  AssetClass,
  Insight,
} from '../types';
import { fetchDashboardSummary } from '../services/api';
import { useCardsStore } from './cardsStore';
import { logger } from '../utils/logger';
import { fetchBenchmarks, type BenchmarkData } from '../services/benchmarks';

type TimeRange = '1M' | '3M' | '6M' | '1A' | 'MAX';

interface PortfolioState {
  summary: PortfolioSummary | null;
  institutions: Institution[];
  assets: Asset[];
  allocations: Allocation[];
  insights: Insight[];
  benchmarks: BenchmarkData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  selectedTimeRange: TimeRange;
  selectedAssetClass: AssetClass | null;

  loadPortfolio: () => Promise<void>;
  refresh: () => Promise<void>;
  loadBenchmarks: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  setSelectedAssetClass: (assetClass: AssetClass | null) => void;
  getAssetsByClass: (assetClass: AssetClass) => Asset[];
  getAssetsByInstitution: (institutionId: string) => Asset[];
}

export const usePortfolioStore = create<PortfolioState>((set, get) => {
  /**
   * Processes the raw dashboard API response: recomputes institution stats and
   * allocation values from detailed assets when available, updates portfolio
   * state, and forwards cards/transactions to cardsStore.
   */
  const processDashboardData = (
    dashboardData: Awaited<ReturnType<typeof fetchDashboardSummary>>,
  ) => {
    const assets = dashboardData.assets;
    let institutions = dashboardData.institutions;
    let allocations = dashboardData.allocations;

    // If we have detailed assets, recompute institution stats from them
    if (assets.length > 0 && institutions.length > 0) {
      institutions = institutions.map((inst) => {
        const instAssets = assets.filter(
          (a) =>
            a.institution === inst.id ||
            a.institution === inst.name ||
            (a.institution ?? '').toLowerCase().includes(inst.id),
        );
        return {
          ...inst,
          assetCount: instAssets.length > 0 ? instAssets.length : inst.assetCount,
          totalValue: instAssets.length > 0
            ? instAssets.reduce((sum, a) => sum + a.currentValue, 0)
            : inst.totalValue,
        };
      });
    }

    // Recompute allocations from actual assets if both exist
    if (assets.length > 0 && allocations.length > 0) {
      allocations = allocations.map((alloc) => {
        const classAssets = assets.filter((a) => a.class === alloc.class);
        return {
          ...alloc,
          value: classAssets.length > 0
            ? classAssets.reduce((sum, a) => sum + a.currentValue, 0)
            : alloc.value,
        };
      });
    }

    set({
      summary: dashboardData.summary,
      institutions,
      assets,
      allocations,
      insights: dashboardData.insights,
      error: null,
    });

    // Push cards and transactions to cardsStore if available
    if (dashboardData.cards.length > 0 || dashboardData.transactions.length > 0) {
      useCardsStore.getState()._setCardsFromDashboard(dashboardData.cards, dashboardData.transactions);
    }
  };

  return {
  summary: null,
  institutions: [],
  assets: [],
  allocations: [],
  insights: [],
  benchmarks: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  selectedTimeRange: '1A',
  selectedAssetClass: null,

  loadPortfolio: async () => {
    set({ isLoading: true, error: null });

    try {
      const dashboardData = await fetchDashboardSummary();
      processDashboardData(dashboardData);
      set({ isLoading: false });
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
      const dashboardData = await fetchDashboardSummary();
      processDashboardData(dashboardData);
      set({ isRefreshing: false });
    } catch (err: any) {
      set({
        isRefreshing: false,
        error: err?.message ?? 'Erro ao atualizar portfolio',
      });
    }
  },

  loadBenchmarks: async () => {
    try {
      const data = await fetchBenchmarks();
      // Only set benchmarks if at least one value is non-zero (BRAPI actually returned data)
      const ref = data['12M'];
      if (ref.cdi !== 0 || ref.ipca !== 0 || ref.ibov !== 0) {
        set({ benchmarks: data });
      }
    } catch (err) {
      logger.log('[Portfolio] loadBenchmarks error:', err);
    }
  },

  setTimeRange: (range: TimeRange) => set({ selectedTimeRange: range }),

  setSelectedAssetClass: (assetClass: AssetClass | null) =>
    set({ selectedAssetClass: assetClass }),

  getAssetsByClass: (assetClass: AssetClass) =>
    get().assets.filter((a) => a.class === assetClass),

  getAssetsByInstitution: (institutionId: string) =>
    get().assets.filter((a) => a.institution === institutionId),
  };
});
