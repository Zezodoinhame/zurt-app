import { create } from 'zustand';
import type { SpendingInsightsData, TransactionCategory, CategoryTrend } from '../types';
import { useAuthStore } from './authStore';
import { demoSpendingInsights } from '../data/demo';
import { logger } from '../utils/logger';

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  food: 'Alimentacao',
  transport: 'Transporte',
  subscriptions: 'Assinaturas',
  shopping: 'Compras',
  fuel: 'Combustivel',
  health: 'Saude',
  travel: 'Viagens',
  tech: 'Tecnologia',
};

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  food: '#FF6B6B',
  transport: '#4ECDC4',
  subscriptions: '#A855F7',
  shopping: '#FFD93D',
  fuel: '#FF8C42',
  health: '#2ECC71',
  travel: '#00BCD4',
  tech: '#3498DB',
};

function computeInsightsFromTransactions(): SpendingInsightsData | null {
  try {
    const { useCardsStore } = require('./cardsStore');
    const transactions = useCardsStore.getState().transactions || [];
    if (transactions.length === 0) return null;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Filter expenses (negative amounts or positive — depends on convention)
    const expenses = transactions.filter((t: any) => {
      const amount = Math.abs(t.amount ?? 0);
      return amount > 0;
    });

    if (expenses.length === 0) return null;

    // Separate this month vs last month
    const thisMonthExpenses = expenses.filter((t: any) => {
      const d = new Date(t.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const lastMonthExpenses = expenses.filter((t: any) => {
      const d = new Date(t.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const totalThisMonth = thisMonthExpenses.reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0);
    const totalLastMonth = lastMonthExpenses.reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0);

    // Avg daily spend (this month)
    const dayOfMonth = now.getDate();
    const avgDailySpend = dayOfMonth > 0 ? totalThisMonth / dayOfMonth : 0;

    // Biggest expense
    const sorted = [...thisMonthExpenses].sort((a: any, b: any) => Math.abs(b.amount) - Math.abs(a.amount));
    const biggest = sorted[0] as any;
    const biggestExpense = biggest
      ? { description: biggest.description || biggest.merchant || 'Despesa', amount: Math.abs(biggest.amount), date: biggest.date }
      : { description: '-', amount: 0, date: new Date().toISOString() };

    // Spending velocity (% of last month spent so far)
    const spendingVelocity = totalLastMonth > 0 ? (totalThisMonth / totalLastMonth) * 100 : 0;

    // Savings rate estimate (assume income = 2x spending as rough heuristic)
    const estimatedIncome = totalLastMonth > 0 ? totalLastMonth * 1.5 : totalThisMonth * 1.5;
    const savingsRate = estimatedIncome > 0 ? Math.max(0, ((estimatedIncome - totalThisMonth) / estimatedIncome) * 100) : 0;

    // Category trends (last 3 months)
    const categoryMap = new Map<TransactionCategory, number[]>();
    for (let offset = 2; offset >= 0; offset--) {
      const m = new Date(thisYear, thisMonth - offset, 1);
      const mMonth = m.getMonth();
      const mYear = m.getFullYear();

      const monthExpenses = expenses.filter((t: any) => {
        const d = new Date(t.date);
        return d.getMonth() === mMonth && d.getFullYear() === mYear;
      });

      // Group by category
      const byCat = new Map<TransactionCategory, number>();
      monthExpenses.forEach((t: any) => {
        const cat = (t.category || 'other') as TransactionCategory;
        byCat.set(cat, (byCat.get(cat) || 0) + Math.abs(t.amount ?? 0));
      });

      for (const [cat, amount] of byCat) {
        if (!categoryMap.has(cat)) categoryMap.set(cat, [0, 0, 0]);
        const arr = categoryMap.get(cat)!;
        arr[2 - offset] = amount;
      }
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const categoryTrends: CategoryTrend[] = Array.from(categoryMap.entries())
      .map(([cat, amounts]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        color: CATEGORY_COLORS[cat] || '#95A5A6',
        months: amounts.map((amount, i) => {
          const m = new Date(thisYear, thisMonth - (2 - i), 1);
          return { month: monthNames[m.getMonth()], amount };
        }),
      }))
      .sort((a, b) => {
        const aTotal = a.months.reduce((s, m) => s + m.amount, 0);
        const bTotal = b.months.reduce((s, m) => s + m.amount, 0);
        return bTotal - aTotal;
      });

    // Top merchants
    const merchantMap = new Map<string, { total: number; count: number }>();
    thisMonthExpenses.forEach((t: any) => {
      const name = t.merchant || t.description || 'Desconhecido';
      const prev = merchantMap.get(name) || { total: 0, count: 0 };
      merchantMap.set(name, { total: prev.total + Math.abs(t.amount ?? 0), count: prev.count + 1 });
    });

    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      categoryTrends,
      topMerchants,
      avgDailySpend: Math.round(avgDailySpend * 100) / 100,
      biggestExpense,
      spendingVelocity: Math.round(spendingVelocity * 10) / 10,
      savingsRate: Math.round(savingsRate * 10) / 10,
      totalThisMonth: Math.round(totalThisMonth * 100) / 100,
      totalLastMonth: Math.round(totalLastMonth * 100) / 100,
    };
  } catch (err) {
    logger.log('[SpendingInsights] compute error:', err);
    return null;
  }
}

interface SpendingInsightsState {
  insights: SpendingInsightsData | null;
  isLoading: boolean;
  error: string | null;
  selectedCategory: TransactionCategory | null;

  loadInsights: () => Promise<void>;
  selectCategory: (cat: TransactionCategory | null) => void;
}

export const useSpendingInsightsStore = create<SpendingInsightsState>((set) => ({
  insights: null,
  isLoading: false,
  error: null,
  selectedCategory: null,

  loadInsights: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ insights: demoSpendingInsights, isLoading: false });
        return;
      }
      // Compute insights from real credit card transactions
      const computed = computeInsightsFromTransactions();
      set({ insights: computed, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading insights' });
    }
  },

  selectCategory: (cat) => set({ selectedCategory: cat }),
}));
