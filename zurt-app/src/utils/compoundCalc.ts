// Pure functions for compound interest calculations

import type { CompoundParams, CompoundResult } from '../types';

export function calculateCompoundInterest(params: CompoundParams): CompoundResult {
  const monthlyRate = params.annualRate / 100 / 12;
  const realRate = params.inflationAdjust
    ? ((1 + params.annualRate / 100) / (1 + params.inflationRate / 100) - 1) / 12
    : monthlyRate;
  const totalMonths = params.years * 12;

  const projectionByMonth: { month: number; balance: number; balanceAdj: number }[] = [];

  let balance = params.initialAmount;
  let balanceAdj = params.initialAmount;

  projectionByMonth.push({ month: 0, balance, balanceAdj });

  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + params.monthlyContribution;
    balanceAdj = balanceAdj * (1 + realRate) + params.monthlyContribution;
    // Only push yearly snapshots + final month to keep array manageable
    if (m % 12 === 0 || m === totalMonths) {
      projectionByMonth.push({ month: m, balance: Math.round(balance), balanceAdj: Math.round(balanceAdj) });
    }
  }

  const totalInvested = params.initialAmount + params.monthlyContribution * totalMonths;
  const finalValue = Math.round(balance);
  const totalInterest = finalValue - totalInvested;
  const finalValueInflationAdj = Math.round(balanceAdj);
  const totalInterestInflationAdj = finalValueInflationAdj - totalInvested;

  return {
    finalValue,
    totalInvested,
    totalInterest,
    finalValueInflationAdj,
    totalInterestInflationAdj,
    projectionByMonth,
  };
}
