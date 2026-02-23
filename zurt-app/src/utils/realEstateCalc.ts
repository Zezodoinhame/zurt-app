import type { RealEstateParams, RealEstateResult } from '../types';

export function calculateMortgage(principal: number, annualRate: number, termYears: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const months = termYears * 12;
  if (monthlyRate === 0) return Math.round(principal / months);
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment);
}

export function calculateRealEstate(params: RealEstateParams): RealEstateResult {
  const downPayment = Math.round(params.propertyValue * params.downPaymentPct / 100);
  const loanAmount = params.propertyValue - downPayment;
  const monthlyPayment = calculateMortgage(loanAmount, params.annualRate, params.termYears);
  const totalPaid = downPayment + monthlyPayment * params.termYears * 12;
  const totalInterest = totalPaid - params.propertyValue;

  const buyTotalCost: number[] = [];
  const rentTotalCost: number[] = [];
  const propertyValues: number[] = [];

  let cumulativeBuy = downPayment;
  let cumulativeRent = 0;
  let currentRent = params.rentValue;
  let breakEvenYear = params.termYears;

  for (let y = 1; y <= params.termYears; y++) {
    cumulativeBuy += monthlyPayment * 12;
    cumulativeRent += currentRent * 12;
    currentRent *= (1 + params.annualRentIncrease / 100);
    const propVal = Math.round(params.propertyValue * Math.pow(1 + params.appreciationRate / 100, y));
    propertyValues.push(propVal);
    buyTotalCost.push(Math.round(cumulativeBuy));
    rentTotalCost.push(Math.round(cumulativeRent));

    if (cumulativeBuy <= cumulativeRent && breakEvenYear === params.termYears) {
      breakEvenYear = y;
    }
  }

  const recommendation: 'buy' | 'rent' | 'neutral' =
    breakEvenYear <= 10 ? 'buy' : breakEvenYear >= 25 ? 'rent' : 'neutral';

  return {
    monthlyPayment,
    totalPaid,
    totalInterest,
    downPayment,
    loanAmount,
    breakEvenYear,
    buyTotalCost,
    rentTotalCost,
    propertyValues,
    recommendation,
  };
}
