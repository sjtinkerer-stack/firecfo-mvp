/**
 * Dashboard Calculation Utilities
 * Helper functions for projections and chart data generation
 */

import { NetWorthChartDataPoint, AssetAllocation, DashboardData } from '../types';

/**
 * Generate net worth chart data points from current to FIRE age
 * Shows: Current NW → Projected Corpus (with 12% growth) → Required Corpus
 */
export function generateNetWorthChartData(data: DashboardData): NetWorthChartDataPoint[] {
  const currentYear = new Date().getFullYear();
  const currentAge = data.age;
  const fireAge = data.fireAge;
  const yearsToFire = fireAge - currentAge;

  const chartData: NetWorthChartDataPoint[] = [];

  // Assumptions
  const annualReturnRate = 0.12; // 12% pre-retirement returns
  const monthlyReturnRate = Math.pow(1 + annualReturnRate, 1 / 12) - 1;

  // Point 1: Current Net Worth (Today)
  chartData.push({
    year: currentYear,
    age: currentAge,
    label: 'Today',
    currentNetworth: data.currentNetworth,
    projectedCorpus: data.currentNetworth,
    requiredCorpus: data.requiredCorpus,
  });

  // Intermediate points (every 5 years, or fewer if timeline is short)
  const step = yearsToFire <= 10 ? 2 : 5;
  for (let yearOffset = step; yearOffset < yearsToFire; yearOffset += step) {
    const futureAge = currentAge + yearOffset;
    const monthsElapsed = yearOffset * 12;

    // Future value of current assets
    const futureValueOfAssets = data.currentNetworth * Math.pow(1 + annualReturnRate, yearOffset);

    // Future value of monthly savings (annuity formula)
    const futureValueOfSavings =
      data.monthlySavings * ((Math.pow(1 + monthlyReturnRate, monthsElapsed) - 1) / monthlyReturnRate);

    const projectedCorpus = futureValueOfAssets + futureValueOfSavings;

    chartData.push({
      year: currentYear + yearOffset,
      age: futureAge,
      label: `Age ${futureAge}`,
      projectedCorpus: Math.round(projectedCorpus),
      requiredCorpus: data.requiredCorpus,
    });
  }

  // Point N: FIRE Age (Target)
  chartData.push({
    year: currentYear + yearsToFire,
    age: fireAge,
    label: `FIRE at ${fireAge}`,
    projectedCorpus: data.projectedCorpusAtFire,
    requiredCorpus: data.requiredCorpus,
  });

  return chartData;
}

/**
 * Generate asset allocation data for pie chart
 * Filters out zero-value assets
 */
export function generateAssetAllocationData(data: DashboardData): AssetAllocation[] {
  const allocations: AssetAllocation[] = [
    {
      name: 'Equity',
      value: data.equity,
      percentage: 0,
      color: '#3b82f6', // blue-500
    },
    {
      name: 'Debt',
      value: data.debt,
      percentage: 0,
      color: '#10b981', // emerald-500
    },
    {
      name: 'Cash',
      value: data.cash,
      percentage: 0,
      color: '#eab308', // yellow-500
    },
    {
      name: 'Real Estate',
      value: data.realEstate,
      percentage: 0,
      color: '#f97316', // orange-500
    },
    {
      name: 'Other',
      value: data.otherAssets,
      percentage: 0,
      color: '#a855f7', // purple-500
    },
  ];

  // Filter out zero-value assets
  const nonZeroAllocations = allocations.filter((a) => a.value > 0);

  // Calculate percentages
  const total = nonZeroAllocations.reduce((sum, a) => sum + a.value, 0);
  nonZeroAllocations.forEach((a) => {
    a.percentage = total > 0 ? (a.value / total) * 100 : 0;
  });

  return nonZeroAllocations;
}

/**
 * Calculate monthly savings gap (if not on track)
 */
export function calculateSavingsGap(data: DashboardData): number {
  if (data.isOnTrack) return 0;
  return Math.max(0, data.monthlySavingsNeeded - data.monthlySavings);
}

/**
 * Get recommended asset allocation based on age
 * Rule: Equity% = 100 - Age (clamped 30-70%)
 */
export function getRecommendedAllocation(age: number): {
  equity: number;
  debt: number;
  cash: number;
} {
  const equityPercent = Math.max(30, Math.min(70, 100 - age));
  const debtPercent = Math.max(20, Math.min(50, age));
  const cashPercent = 100 - equityPercent - debtPercent;

  return {
    equity: equityPercent,
    debt: debtPercent,
    cash: cashPercent,
  };
}

/**
 * Format large numbers in Indian format (lakhs/crores)
 */
export function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) {
    // >= 1 crore
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  } else if (amount >= 100000) {
    // >= 1 lakh
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  } else {
    return `₹${amount.toFixed(0)}`;
  }
}

/**
 * Format Indian currency with full number formatting
 */
export function formatFullIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
