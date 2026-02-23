// =============================================================================
// ZURT — Investment Simulator Calculations
// =============================================================================

export interface TimelinePoint {
  year: number;
  invested: number;
  gains: number;
  total: number;
}

export interface SimulationResult {
  finalAmount: number;
  totalInvested: number;
  gains: number;
  timeline: TimelinePoint[];
}

export interface GoalProjection {
  monthsRemaining: number;
  estimatedDate: string;
}

// Risk profile annual rates
export const RISK_RATES = {
  conservative: 0.08,
  moderate: 0.12,
  aggressive: 0.18,
} as const;

export type RiskProfile = keyof typeof RISK_RATES;

/**
 * Simulates a recurring monthly investment with optional initial amount.
 * FV = PV × (1+r)^n + PMT × [((1+r)^n - 1) / r]
 */
export function simulateInvestment(
  monthlyContribution: number,
  termMonths: number,
  annualRate: number,
  initialAmount: number = 0,
): SimulationResult {
  const monthlyRate = annualRate / 12;
  const totalInvested = initialAmount + monthlyContribution * termMonths;

  let finalAmount: number;
  if (monthlyRate === 0) {
    finalAmount = totalInvested;
  } else {
    const pvGrowth = initialAmount * Math.pow(1 + monthlyRate, termMonths);
    const pmtGrowth =
      monthlyContribution *
      ((Math.pow(1 + monthlyRate, termMonths) - 1) / monthlyRate);
    finalAmount = pvGrowth + pmtGrowth;
  }

  const gains = finalAmount - totalInvested;

  // Yearly snapshots for chart
  const timeline: TimelinePoint[] = [];
  const totalYears = Math.ceil(termMonths / 12);

  for (let y = 1; y <= totalYears; y++) {
    const months = Math.min(y * 12, termMonths);
    const invested = initialAmount + monthlyContribution * months;
    let accumulated: number;
    if (monthlyRate === 0) {
      accumulated = invested;
    } else {
      const pvG = initialAmount * Math.pow(1 + monthlyRate, months);
      const pmtG =
        monthlyContribution *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      accumulated = pvG + pmtG;
    }
    timeline.push({
      year: y,
      invested,
      gains: accumulated - invested,
      total: accumulated,
    });
  }

  return {
    finalAmount: Math.round(finalAmount * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    gains: Math.round(gains * 100) / 100,
    timeline,
  };
}

/**
 * Estimates how long until a goal is reached given current savings rate.
 */
export function calculateGoalProjection(
  currentAmount: number,
  targetAmount: number,
  monthlySavings: number,
): GoalProjection {
  if (monthlySavings <= 0 || currentAmount >= targetAmount) {
    return { monthsRemaining: 0, estimatedDate: new Date().toISOString() };
  }

  const remaining = targetAmount - currentAmount;
  const monthsRemaining = Math.ceil(remaining / monthlySavings);

  const estimated = new Date();
  estimated.setMonth(estimated.getMonth() + monthsRemaining);

  return {
    monthsRemaining,
    estimatedDate: estimated.toISOString(),
  };
}

/**
 * Projects goal completion using compound interest.
 * Returns months until target is reached, or 0 if already reached.
 */
export function projectGoalWithRate(
  current: number,
  monthly: number,
  monthlyRate: number,
  target: number,
): number {
  if (current >= target) return 0;
  if (monthly <= 0 && monthlyRate <= 0) return 0;

  let balance = current;
  let months = 0;
  while (balance < target && months < 600) {
    balance = balance * (1 + monthlyRate) + monthly;
    months++;
  }
  return months;
}
