// =============================================================================
// Backtest Calculator — Pure functions for portfolio backtesting math
// =============================================================================

/** Compound annual growth rate */
export function calcCAGR(initialValue: number, finalValue: number, years: number): number {
  if (initialValue <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

/** Maximum drawdown from peak (returns negative %) */
export function calcMaxDrawdown(values: number[]): number {
  if (values.length < 2) return 0;
  let peak = values[0];
  let maxDd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }
  return parseFloat((maxDd * 100).toFixed(2));
}

/** Annualized Sharpe ratio (monthly returns, risk-free rate default 0.5%/month ≈ 6% annual) */
export function calcSharpe(monthlyReturns: number[], riskFreeMonthly = 0.5): number {
  if (monthlyReturns.length < 2) return 0;
  const excessReturns = monthlyReturns.map((r) => r - riskFreeMonthly);
  const mean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const variance = excessReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (excessReturns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return parseFloat(((mean / stdDev) * Math.sqrt(12)).toFixed(2)); // annualized
}

/** Total return percentage */
export function calcTotalReturn(initialValue: number, finalValue: number): number {
  if (initialValue <= 0) return 0;
  return parseFloat(((finalValue / initialValue - 1) * 100).toFixed(2));
}

/** Compound monthly returns into a value series starting from initialValue */
export function compoundReturns(monthlyReturnsPct: number[], initialValue: number): number[] {
  const values: number[] = [initialValue];
  let current = initialValue;
  for (const r of monthlyReturnsPct) {
    current = current * (1 + r / 100);
    values.push(Math.round(current));
  }
  return values;
}
