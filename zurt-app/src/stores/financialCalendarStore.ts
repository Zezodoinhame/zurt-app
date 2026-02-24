import { create } from 'zustand';
import type { FinancialEvent, FinancialEventType } from '../types';
import { demoFinancialEvents } from '../data/demo';

interface FinancialCalendarState {
  events: FinancialEvent[];
  selectedMonth: string; // 'YYYY-MM'
  customEvents: FinancialEvent[];

  setMonth: (month: string) => void;
  addEvent: (event: Omit<FinancialEvent, 'id'>) => void;
  removeEvent: (id: string) => void;
  getEventsForMonth: () => FinancialEvent[];
  getMonthlyIncome: () => number;
  getMonthlyExpenses: () => number;
  getAvailableMonths: () => string[];
}

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const useFinancialCalendarStore = create<FinancialCalendarState>((set, get) => ({
  events: demoFinancialEvents,
  selectedMonth: currentMonth,
  customEvents: [],

  setMonth: (month) => set({ selectedMonth: month }),

  addEvent: (input) => {
    const newEvent: FinancialEvent = { ...input, id: `fe-${Date.now()}` };
    const customEvents = [...get().customEvents, newEvent];
    set({ customEvents });
  },

  removeEvent: (id) => {
    const customEvents = get().customEvents.filter((e) => e.id !== id);
    set({ customEvents });
  },

  getEventsForMonth: () => {
    const { events, customEvents, selectedMonth } = get();
    const allEvents = [...events, ...customEvents];
    return allEvents
      .filter((e) => e.date.startsWith(selectedMonth))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getMonthlyIncome: () => {
    const events = get().getEventsForMonth();
    return events
      .filter((e) => e.type === 'dividend')
      .reduce((sum, e) => sum + e.amount, 0);
  },

  getMonthlyExpenses: () => {
    const events = get().getEventsForMonth();
    return events
      .filter((e) => e.type === 'bill' || e.type === 'tax_deadline')
      .reduce((sum, e) => sum + e.amount, 0);
  },

  getAvailableMonths: () => {
    const { events, customEvents } = get();
    const allEvents = [...events, ...customEvents];
    const months = new Set<string>();
    allEvents.forEach((e) => {
      const m = e.date.substring(0, 7);
      months.add(m);
    });
    // Also add current month and next 2 months
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(months).sort();
  },
}));
