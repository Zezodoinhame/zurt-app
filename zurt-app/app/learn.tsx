import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useLearnStore } from '../src/stores/learnStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { CircularProgress } from '../src/components/charts/CircularProgress';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { Button } from '../src/components/ui/Button';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import type { LessonCategory, Lesson } from '../src/types';

type CategoryFilter = LessonCategory | 'all';

const CATEGORIES: { key: CategoryFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'learn.allCategories' },
  { key: 'beginner', labelKey: 'learn.beginner' },
  { key: 'intermediate', labelKey: 'learn.intermediate' },
  { key: 'advanced', labelKey: 'learn.advanced' },
];

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();

  const {
    lessons, glossary, progress, isLoading, loadLearn,
    markComplete, getCompletedCount, getTotalCount, isCompleted,
    getLessonsByCategory, searchGlossary,
  } = useLearnStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => { loadLearn(); }, []);

  const completedCount = useMemo(() => getCompletedCount(), [progress]);
  const totalCount = useMemo(() => getTotalCount(), [lessons]);
  const filteredLessons = useMemo(() => getLessonsByCategory(categoryFilter), [lessons, categoryFilter]);
  const filteredGlossary = useMemo(() => searchGlossary(glossarySearch), [glossary, glossarySearch]);
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  const handleLessonPress = useCallback((lesson: Lesson) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLesson(lesson);
    setSheetVisible(true);
  }, []);

  const handleMarkComplete = useCallback(() => {
    if (!selectedLesson) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markComplete(selectedLesson.id);
    setSheetVisible(false);
  }, [selectedLesson, markComplete]);

  const categoryColor = useCallback((cat: LessonCategory) => {
    if (cat === 'beginner') return colors.positive;
    if (cat === 'intermediate') return colors.warning;
    return colors.negative;
  }, [colors]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('learn.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <SkeletonList />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('learn.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <Card variant="glow">
          <View style={styles.progressRow}>
            <CircularProgress
              progress={progressPct}
              size={72}
              strokeWidth={7}
              color={accentColor}
            >
              <Text style={[styles.progressPct, { color: accentColor }]}>{Math.round(progressPct * 100)}%</Text>
            </CircularProgress>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>{t('learn.progress')}</Text>
              <Text style={styles.progressSub}>{completedCount}/{totalCount} {t('learn.lessonsCompleted')}</Text>
              <View style={styles.streakRow}>
                <Text style={styles.streakEmoji}>{'\uD83D\uDD25'}</Text>
                <Text style={styles.streakText}>{t('learn.streak')}: {progress.streak} {t('learn.days')}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Category Pills */}
        <View style={styles.pillRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.pill, categoryFilter === cat.key && { backgroundColor: accentColor }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategoryFilter(cat.key); }}
            >
              <Text style={[styles.pillText, categoryFilter === cat.key && { color: '#FFF' }]}>{t(cat.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lesson Cards */}
        {filteredLessons.map((lesson) => {
          const done = isCompleted(lesson.id);
          return (
            <TouchableOpacity key={lesson.id} onPress={() => handleLessonPress(lesson)} activeOpacity={0.7}>
              <Card style={done ? { ...styles.lessonCard, ...styles.lessonCardDone } : styles.lessonCard}>
                <View style={styles.lessonRow}>
                  <Text style={styles.lessonEmoji}>{lesson.emoji}</Text>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonDesc} numberOfLines={2}>{lesson.description}</Text>
                    <View style={styles.lessonMeta}>
                      <Badge variant="neutral" value={`${lesson.readingTimeMin} ${t('learn.readingTime')}`} size="sm" />
                      <Badge variant={lesson.category === 'beginner' ? 'positive' : lesson.category === 'intermediate' ? 'warning' : 'negative'} value={t(`learn.${lesson.category}`)} size="sm" />
                    </View>
                  </View>
                  {done && <Text style={styles.checkmark}>{'\u2705'}</Text>}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Glossary Section */}
        <Text style={styles.sectionTitle}>{t('learn.glossary')}</Text>
        <View style={styles.searchContainer}>
          <AppIcon name="search" size={18} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            value={glossarySearch}
            onChangeText={setGlossarySearch}
            placeholder={t('learn.searchGlossary')}
            placeholderTextColor={colors.text.muted}
          />
        </View>

        {filteredGlossary.map((term, idx) => (
          <Card key={idx} style={styles.glossaryCard}>
            <Text style={styles.glossaryTerm}>{term.term}</Text>
            <Text style={styles.glossaryDef}>{term.definition}</Text>
          </Card>
        ))}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Lesson Content Sheet */}
      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={selectedLesson?.title || ''}>
        <View style={styles.sheetContent}>
          {selectedLesson && (
            <>
              <Text style={styles.lessonContentEmoji}>{selectedLesson.emoji}</Text>
              <Text style={styles.lessonContentText}>{selectedLesson.content}</Text>
              {!isCompleted(selectedLesson.id) && (
                <Button title={t('learn.markComplete')} onPress={handleMarkComplete} style={{ marginTop: spacing.md }} />
              )}
              {isCompleted(selectedLesson.id) && (
                <Badge variant="positive" value={t('learn.completed')} />
              )}
            </>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    content: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.md },
    progressCard: { padding: spacing.lg },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    progressInfo: { flex: 1 },
    progressTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    progressSub: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
    progressPct: { fontSize: 16, fontWeight: '700' },
    streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    streakEmoji: { fontSize: 16 },
    streakText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
    pillRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    pillText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
    lessonCard: { padding: spacing.md },
    lessonCardDone: { opacity: 0.7 },
    lessonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    lessonEmoji: { fontSize: 28 },
    lessonInfo: { flex: 1 },
    lessonTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 2 },
    lessonDesc: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.sm },
    lessonMeta: { flexDirection: 'row', gap: spacing.sm },
    checkmark: { fontSize: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginTop: spacing.sm },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
    searchInput: { flex: 1, color: colors.text.primary, fontSize: 14, paddingVertical: 0 },
    glossaryCard: { padding: spacing.md },
    glossaryTerm: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
    glossaryDef: { fontSize: 13, color: colors.text.secondary, lineHeight: 20 },
    sheetContent: { padding: spacing.md, gap: spacing.md },
    lessonContentEmoji: { fontSize: 40, textAlign: 'center' },
    lessonContentText: { fontSize: 14, color: colors.text.secondary, lineHeight: 22 },
  });
}
