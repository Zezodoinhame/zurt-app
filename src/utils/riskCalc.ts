import type { Allocation, Asset, RiskMetrics, RadarDimension } from '../types';
import { demoRiskMetrics } from '../data/demo';

export type ScoreLabel = 'excellent' | 'good' | 'fair' | 'poor';

export function calculateHealthScore(
  _allocations: Allocation[],
  _assets: Asset[],
): RiskMetrics {
  // In production this would compute real risk metrics from live data.
  // For now return demo data.
  return demoRiskMetrics;
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export function getScoreColor(
  score: number,
  colors: { positive: string; warning: string; negative: string; accent: string },
): string {
  if (score >= 80) return colors.positive;
  if (score >= 60) return colors.accent;
  if (score >= 40) return colors.warning;
  return colors.negative;
}

export function normalizeForRadar(metrics: RiskMetrics): RadarDimension[] {
  return [
    { label: 'Sharpe', value: Math.min(metrics.sharpe / 2 * 100, 100) },
    { label: 'Beta', value: Math.min((1 - Math.abs(metrics.beta - 1)) * 100, 100) },
    { label: 'Drawdown', value: Math.max(100 + metrics.maxDrawdown * 5, 0) },
    { label: 'Volatilidade', value: Math.max(100 - metrics.volatility * 3, 0) },
    { label: 'Diversif.', value: metrics.diversification },
    { label: 'Concentr.', value: Math.max(100 - metrics.concentration, 0) },
  ];
}
