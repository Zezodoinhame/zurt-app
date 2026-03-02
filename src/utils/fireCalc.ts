import type { FIREParams, FIREResult } from '../types';

export function calculateFIRE(params: FIREParams): FIREResult {
  const annualSavings = params.annualIncome - params.annualExpenses;
  const monthlySavings = Math.round(annualSavings / 12);
  const savingsRate = params.annualIncome > 0 ? Math.round((annualSavings / params.annualIncome) * 100) : 0;

  const fireNumber = Math.round(params.annualExpenses / (params.safeWithdrawalRate / 100));
  const leanFireNumber = Math.round(fireNumber * 0.7);
  const fatFireNumber = Math.round(fireNumber * 1.5);

  const realReturn = ((1 + params.expectedReturn / 100) / (1 + params.inflation / 100) - 1);

  // Years to FI
  let yearsToFI = 0;
  let netWorth = params.currentNetWorth;
  const projectionByYear: { year: number; age: number; netWorth: number }[] = [
    { year: 0, age: params.currentAge, netWorth: Math.round(netWorth) },
  ];

  while (netWorth < fireNumber && yearsToFI < 60) {
    yearsToFI++;
    netWorth = netWorth * (1 + realReturn) + annualSavings;
    projectionByYear.push({
      year: yearsToFI,
      age: params.currentAge + yearsToFI,
      netWorth: Math.round(netWorth),
    });
  }

  // Add a few more years after reaching FI for the chart
  for (let i = 1; i <= 5; i++) {
    netWorth = netWorth * (1 + realReturn);
    projectionByYear.push({
      year: yearsToFI + i,
      age: params.currentAge + yearsToFI + i,
      netWorth: Math.round(netWorth),
    });
  }

  const fiAge = params.currentAge + yearsToFI;

  // Coast FIRE: amount needed now to reach FIRE with $0 contributions
  const yearsToRetirement = Math.max(65 - params.currentAge, 1);
  const coastFireNumber = Math.round(fireNumber / Math.pow(1 + realReturn, yearsToRetirement));
  const isCoastFIReached = params.currentNetWorth >= coastFireNumber;

  // Coast FIRE age: at what age current net worth compounds to FIRE number
  let coastFireAge = params.currentAge;
  let compoundedValue = params.currentNetWorth;
  while (compoundedValue < fireNumber && coastFireAge < 100) {
    coastFireAge++;
    compoundedValue *= (1 + realReturn);
  }

  return {
    fireNumber,
    leanFireNumber,
    fatFireNumber,
    coastFireNumber,
    coastFireAge,
    savingsRate,
    yearsToFI,
    fiAge,
    monthlySavings,
    projectionByYear,
    isCoastFIReached,
  };
}
