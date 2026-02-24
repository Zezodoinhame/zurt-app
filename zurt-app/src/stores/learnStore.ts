import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lesson, GlossaryTerm, LearnProgress, LessonCategory } from '../types';
import { useAuthStore } from './authStore';
import { demoLessons, demoGlossary, demoLearnProgress } from '../data/demo';

const STORAGE_KEY = '@zurt:learn';

interface LearnState {
  lessons: Lesson[];
  glossary: GlossaryTerm[];
  progress: LearnProgress;
  isLoading: boolean;
  error: string | null;

  loadLearn: () => Promise<void>;
  markComplete: (lessonId: string) => void;
  getCompletedCount: () => number;
  getTotalCount: () => number;
  isCompleted: (lessonId: string) => boolean;
  getLessonsByCategory: (category: LessonCategory | 'all') => Lesson[];
  searchGlossary: (query: string) => GlossaryTerm[];
}

export const useLearnStore = create<LearnState>((set, get) => ({
  lessons: [],
  glossary: [],
  progress: { completedIds: [], streak: 0, lastCompletedDate: '' },
  isLoading: false,
  error: null,

  loadLearn: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ lessons: demoLessons, glossary: demoGlossary, progress: demoLearnProgress, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const progress = stored ? JSON.parse(stored) : { completedIds: [], streak: 0, lastCompletedDate: '' };
      // Lessons and glossary are static educational content, not personal data
      set({ lessons: demoLessons, glossary: demoGlossary, progress, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading learn data' });
    }
  },

  markComplete: (lessonId) => {
    const { progress } = get();
    if (progress.completedIds.includes(lessonId)) return;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = progress.lastCompletedDate === yesterday || progress.lastCompletedDate === today ? progress.streak + 1 : 1;
    const updated: LearnProgress = {
      completedIds: [...progress.completedIds, lessonId],
      streak: newStreak,
      lastCompletedDate: today,
    };
    set({ progress: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getCompletedCount: () => get().progress.completedIds.length,
  getTotalCount: () => get().lessons.length,
  isCompleted: (lessonId) => get().progress.completedIds.includes(lessonId),

  getLessonsByCategory: (category) => {
    const { lessons } = get();
    if (category === 'all') return lessons;
    return lessons.filter((l) => l.category === category);
  },

  searchGlossary: (query) => {
    const { glossary } = get();
    if (!query.trim()) return glossary;
    const lower = query.toLowerCase();
    return glossary.filter((g) => g.term.toLowerCase().includes(lower) || g.definition.toLowerCase().includes(lower));
  },
}));
