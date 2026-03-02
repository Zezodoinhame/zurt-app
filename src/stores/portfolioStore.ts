import { create } from 'zustand';
import type {
  PortfolioSummary,
  Institution,
  Asset,
  Allocation,
  AssetClass,
  Insight,
} from '../types';
import { fetchDashboardSummary, fetchPortfolioConsolidated } from '../services/api';
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
  loadConsolidated: () => Promise<void>;
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

    // Always push cards and transactions to cardsStore so empty responses clear stale data
    useCardsStore.getState()._setCardsFromDashboard(dashboardData.cards, dashboardData.transactions);
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

  loadConsolidated: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchPortfolioConsolidated();

      const summary: PortfolioSummary = {
        totalValue: data.patrimonio?.total ?? 0,
        investedValue: data.patrimonio?.investido ?? 0,
        profit: data.patrimonio?.rendimento ?? 0,
        variation1m: 0,
        variation12m: data.patrimonio?.rentabilidade ?? 0,
        history: [],
      };

      const positions: Asset[] = (data.positions ?? []).map((p: any) => ({
        id: String(p.id ?? ''),
        name: p.name ?? '',
        ticker: p.ticker ?? '',
        class: p.class ?? p.asset_class ?? 'other',
        institution: p.institution ?? '',
        quantity: p.quantity ?? 0,
        averagePrice: p.averagePrice ?? p.average_price ?? 0,
        currentPrice: p.currentPrice ?? p.current_price ?? 0,
        investedValue: p.investedValue ?? p.invested_value ?? 0,
        currentValue: p.currentValue ?? p.current_value ?? 0,
        variation: p.variation ?? 0,
        priceHistory: p.priceHistory ?? [],
      }));

      const allocations: Allocation[] = (data.allocation ?? []).map((a: any) => ({
        class: a.class,
        value: a.value ?? 0,
        percentage: a.percentage ?? 0,
        color: a.color ?? '#888',
      }));

      const institutions: Institution[] = (data.connections ?? []).map((c: any) => ({
        id: String(c.id ?? ''),
        name: c.name ?? '',
        logo: c.logo ?? '',
        type: c.type ?? 'bank',
        assetCount: 0,
        totalValue: 0,
      }));

      set({
        summary,
        assets: positions,
        allocations,
        institutions,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      logger.log('[Portfolio] loadConsolidated error, falling back to dashboard:', err?.message);
      // Fall back to standard dashboard endpoint
      try {
        const dashboardData = await fetchDashboardSummary();
        processDashboardData(dashboardData);
        set({ isLoading: false });
      } catch (err2: any) {
        set({
          isLoading: false,
          error: err2?.message ?? 'Erro ao carregar portfolio',
        });
      }
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
