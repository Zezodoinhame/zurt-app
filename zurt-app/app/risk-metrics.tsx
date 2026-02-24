import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useRiskStore } from '../src/stores/riskStore';
import { Card } from '../src/components/ui/Card';
import { GaugeChart } from '../src/components/charts/GaugeChart';
import { RadarChart } from '../src/components/charts/RadarChart';
import { MiniLineChart } from '../src/components/charts/MiniLineChart';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { getScoreLabel, getScoreColor, normalizeForRadar } from '../src/utils/riskCalc';
import { maskValue } from '../src/utils/formatters';

// Placeholder metric cards shown when no real data is available
const PLACEHOLDER_METRICS = [
  { label: 'Sharpe Ratio', desc: 'Mede o retorno ajustado ao risco. Quanto maior, melhor a relação risco/retorno.' },
  { label: 'Volatilidade', desc: 'Mede a variação dos retornos. Alta volatilidade = mais risco.' },
  { label: 'Beta', desc: 'Sensibilidade ao mercado. Beta > 1 = mais volátil que o Ibovespa.' },
  { label: 'Drawdown Máximo', desc: 'Maior queda do pico ao vale. Indica o pior cenário histórico.' },
];

export default function RiskMetricsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();
  const { metrics, isLoading, loadMetrics } = useRiskStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadMetrics();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('risk.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scrollContent}>
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  // Empty state — no portfolio data
  if (!metrics) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('risk.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyHero}>
            <Text style={styles.emptyEmoji}>{'\uD83D\uDC9A'}</Text>
            <Text style={styles.emptyTitle}>Saúde da Carteira</Text>
            <Text style={styles.emptyDesc}>
              Conecte sua conta ou adicione investimentos para ver métricas de risco da sua carteira.
            </Text>
          </View>

          {/* Placeholder metric cards */}
          <Card delay={100}>
            <Text style={styles.sectionTitle}>Métricas de Risco</Text>
            {PLACEHOLDER_METRICS.map((m, i) => (
              <View key={i} style={styles.metricRow}>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricDesc}>{m.desc}</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.text.muted }]}>{'\u2014'}</Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Placeholder data (no API yet, has portfolio data but no calculated metrics)
  const isPlaceholder = metrics.healthScore === 0 && metrics.historicalScores.length === 0;

  if (isPlaceholder) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('risk.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card variant="glow" delay={100}>
            <View style={styles.placeholderHero}>
              <Text style={styles.placeholderEmoji}>{'\uD83D\uDEE0\uFE0F'}</Text>
              <Text style={styles.placeholderTitle}>Calculando métricas...</Text>
              <Text style={styles.placeholderDesc}>
                Estamos processando seus investimentos. As métricas de risco aparecerão aqui em breve.
              </Text>
            </View>
          </Card>

          <Card delay={200}>
            <Text style={styles.sectionTitle}>Métricas de Risco</Text>
            {PLACEHOLDER_METRICS.map((m, i) => (
              <View key={i} style={styles.metricRow}>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricDesc}>{m.desc}</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.text.muted }]}>{'\u2014'}</Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Full data — render normal UI
  const scoreLabel = getScoreLabel(metrics.healthScore);
  const scoreColor = getScoreColor(metrics.healthScore, colors);
  const radarDimensions = normalizeForRadar(metrics);

  const scoreLabelMap: Record<string, string> = {
    excellent: t('risk.excellent'),
    good: t('risk.good'),
    fair: t('risk.fair'),
    poor: t('risk.poor'),
  };

  const metricRows = [
    { label: 'Sharpe Ratio', value: metrics.sharpe.toFixed(2), desc: t('risk.sharpeDesc') },
    { label: 'Beta', value: metrics.beta.toFixed(2), desc: t('risk.betaDesc') },
    { label: 'Max Drawdown', value: `${metrics.maxDrawdown.toFixed(1)}%`, desc: t('risk.drawdownDesc') },
    { label: t('risk.volatility'), value: `${metrics.volatility.toFixed(1)}%`, desc: t('risk.volatilityDesc') },
    { label: t('risk.diversification'), value: `${metrics.diversification}%`, desc: t('risk.diversificationDesc') },
    { label: t('risk.concentration'), value: `${metrics.concentration}%`, desc: t('risk.concentrationDesc') },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('risk.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Gauge */}
        <Card variant="glow" delay={100}>
          <View style={styles.gaugeCenter}>
            <GaugeChart
              score={metrics.healthScore}
              size={180}
              label={scoreLabelMap[scoreLabel]}
            />
          </View>
          <Text style={[styles.heroLabel, { color: scoreColor }]}>
            {t('risk.healthScore')}
          </Text>
        </Card>

        {/* Radar Chart */}
        <Card delay={200}>
          <Text style={styles.sectionTitle}>{t('risk.riskProfile')}</Text>
          <RadarChart dimensions={radarDimensions} size={220} />
        </Card>

        {/* Metrics List */}
        <Card delay={300}>
          <Text style={styles.sectionTitle}>{t('risk.metrics')}</Text>
          {metricRows.map((row, i) => (
            <View key={i} style={styles.metricRow}>
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>{row.label}</Text>
                <Text style={styles.metricDesc}>{row.desc}</Text>
              </View>
              <Text style={styles.metricValue}>
                {valuesHidden ? maskValue('') : row.value}
              </Text>
            </View>
          ))}
        </Card>

        {/* Score Trend */}
        {metrics.historicalScores.length > 0 && (
          <Card delay={400}>
            <Text style={styles.sectionTitle}>{t('risk.scoreTrend')}</Text>
            <View style={styles.trendChart}>
              <MiniLineChart
                data={metrics.historicalScores}
                width={300}
                height={80}
                color={scoreColor}
                strokeWidth={2}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Empty state
    emptyHero: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Placeholder
    placeholderHero: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    placeholderEmoji: { fontSize: 40, marginBottom: spacing.md },
    placeholderTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    placeholderDesc: {
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 18,
    },

    // Normal UI
    gaugeCenter: {
      alignItems: 'center',
      paddingTop: spacing.lg,
    },
    heroLabel: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '40',
    },
    metricInfo: { flex: 1, marginRight: spacing.md },
    metricLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    metricDesc: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: 2,
    },
    metricValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    trendChart: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
  });
