// Pure functions for retirement calculations

import type { RetirementParams, RetirementResult } from '../types';

export function calculateCompoundGrowth(principal: number, monthlyContribution: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const compoundedPrincipal = principal * Math.pow(1 + monthlyRate, months);
  const compoundedContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return Math.round(compoundedPrincipal + compoundedContributions);
}

export function calculateFireNumber(monthlyExpenses: number, safeWithdrawalRate: number = 4): number {
  return Math.round((monthlyExpenses * 12) / (safeWithdrawalRate / 100));
}

export function calculateRetirement(params: RetirementParams): RetirementResult {
  const years = params.retirementAge - params.currentAge;
  const realReturn = ((1 + params.expectedReturn / 100) / (1 + params.inflation / 100) - 1) * 100;

  const projectedFund = calculateCompoundGrowth(
    params.currentSavings,
    params.monthlyContribution,
    params.expectedReturn,
    years,
  );

  const fireNumber = calculateFireNumber(params.monthlyExpenses);
  const monthlyRetirementIncome = Math.round(projectedFund * 0.04 / 12);
  const surplus = projectedFund - fireNumber;

  const timelineByAge: { age: number; balance: number }[] = [];
  for (let i = 0; i <= years + 10; i++) {
    const age = params.currentAge + i;
    const balance = calculateCompoundGrowth(
      params.currentSavings,
      i <= years ? params.monthlyContribution : 0,
      i <= years ? params.expectedReturn : realReturn,
      i,
    );
    timelineByAge.push({ age, balance });
  }

  return { projectedFund, monthlyRetirementIncome, fireNumber, surplus, timelineByAge };
}
