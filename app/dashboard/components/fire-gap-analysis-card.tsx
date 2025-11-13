'use client';

import { motion } from 'framer-motion';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';
import { RequiredCorpusBreakdown } from './required-corpus-breakdown';
import { ProjectedCorpusBreakdown } from './projected-corpus-breakdown';

interface FireGapAnalysisCardProps {
  requiredCorpus: number;
  projectedCorpusAtFire: number;
  isOnTrack: boolean;
  monthlySavings: number;
  monthlySavingsNeeded: number;
  // Props for Required breakdown
  postFireMonthlyExpense: number;
  currentMonthlyExpense: number;
  lifestyleInflationAdjustment: number;
  yearsToFire: number;
  safeWithdrawalRate: number;
  fireAge: number;
  currentAge: number;
  dependents: number;
  savingsRate: number;
  fireLifestyleType: string;
  fireTargetDate: string;
  fireCountdown: {
    years: number;
    months: number;
    days: number;
    totalDays: number;
  };
  // Props for Projected breakdown
  currentNetworth: number;
}

export function FireGapAnalysisCard({
  requiredCorpus,
  projectedCorpusAtFire,
  isOnTrack,
  monthlySavings,
  monthlySavingsNeeded,
  postFireMonthlyExpense,
  currentMonthlyExpense,
  lifestyleInflationAdjustment,
  yearsToFire,
  safeWithdrawalRate,
  fireAge,
  currentAge,
  dependents,
  savingsRate,
  fireLifestyleType,
  fireTargetDate,
  fireCountdown,
  currentNetworth,
}: FireGapAnalysisCardProps) {
  const gap = projectedCorpusAtFire - requiredCorpus;
  const absoluteGap = Math.abs(gap);
  const savingsIncrease = monthlySavingsNeeded - monthlySavings;

  // Use fire_target_date from database (already calculated from date_of_birth + fire_target_age)
  const targetDate = new Date(fireTargetDate);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.toLocaleDateString('en-US', { month: 'long' });

  // Use fireCountdown for accurate years and months display
  const fullYears = fireCountdown.years;
  const remainingMonths = fireCountdown.months;

  // Format FIRE type label
  const fireTypeLabel = fireLifestyleType.charAt(0).toUpperCase() + fireLifestyleType.slice(1) + ' FIRE';

  // Calculate corpus multiplier from stored SWR (duration-based, not age-based)
  // The SWR is calculated using retirement duration (85 - fireAge) during onboarding
  // and stored in the database. We use the inverse to get the multiplier.
  const corpusMultiplier = 1 / safeWithdrawalRate;

  // Calculate early retirement age and safety buffer for surplus
  let yearsEarlier = 0;
  let safetyBufferYears = 0;
  let newFireAge = fireAge;

  if (isOnTrack && gap > 0) {
    // Find the ACTUAL earliest age where projected corpus >= required corpus
    // This matches what the chart shows (intersection point)
    let actualEarliestAge = fireAge;

    // Iterate from current age to target FIRE age to find intersection
    for (let age = currentAge + 1; age < fireAge; age++) {
      const yearsFromNow = age - currentAge;

      // Calculate projected corpus at this age (same formula as chart)
      const futureValueOfAssets = currentNetworth * Math.pow(1.12, yearsFromNow);
      const monthsFromNow = yearsFromNow * 12;
      const monthlyRate = 0.12 / 12;
      const futureValueOfSavings = monthlySavings *
        ((Math.pow(1 + monthlyRate, monthsFromNow) - 1) / monthlyRate);
      const projectedCorpusAtAge = futureValueOfAssets + futureValueOfSavings;

      // Check if we've reached required corpus
      if (projectedCorpusAtAge >= requiredCorpus) {
        actualEarliestAge = age;
        break;
      }
    }

    // Calculate years earlier based on ACTUAL earliest age (matches chart)
    yearsEarlier = fireAge - actualEarliestAge;
    newFireAge = actualEarliestAge;

    // Calculate safety buffer: surplus / annual expense
    const annualExpense = requiredCorpus / corpusMultiplier;
    safetyBufferYears = Math.floor(gap / annualExpense);
  }

  // Status colors
  const statusColors = isOnTrack
    ? {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-900 dark:text-emerald-100',
        accent: 'text-emerald-600 dark:text-emerald-400',
        icon: 'text-emerald-600 dark:text-emerald-400',
        statusBg: 'bg-emerald-100 dark:bg-emerald-900/50',
        statusBorder: 'border-emerald-300 dark:border-emerald-700',
      }
    : {
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-900 dark:text-amber-100',
        accent: 'text-amber-600 dark:text-amber-400',
        icon: 'text-amber-600 dark:text-amber-400',
        statusBg: 'bg-amber-100 dark:bg-amber-900/50',
        statusBorder: 'border-amber-300 dark:border-amber-700',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${statusColors.border} ${statusColors.bg} border-2 rounded-xl overflow-hidden`}
    >
      {/* Enhanced Status Banner Header */}
      <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Status Icon + Heading + FIRE Type */}
          <div className="flex items-center gap-4 flex-1">
            {/* Large Status Icon */}
            <div className={`flex items-center justify-center w-16 h-16 rounded-full ${statusColors.statusBg} ${statusColors.statusBorder} border-2`}>
              {isOnTrack ? (
                <CheckCircle2 className={`w-8 h-8 ${statusColors.icon}`} />
              ) : (
                <AlertTriangle className={`w-8 h-8 ${statusColors.icon}`} />
              )}
            </div>

            {/* Status Heading + FIRE Type Pill */}
            <div>
              <h2 className={`text-2xl font-bold ${statusColors.text} mb-2`}>
                {isOnTrack ? 'On Track to FIRE' : 'Behind FIRE Target'}
              </h2>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors.statusBg} ${statusColors.text} ${statusColors.statusBorder} border`}>
                {fireTypeLabel}
              </span>
            </div>
          </div>

          {/* Right: Years to FIRE Countdown */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Years to FIRE
              </span>
            </div>
            <div className={`text-3xl font-bold ${statusColors.text}`}>
              {fullYears} <span className="text-lg">years</span>{' '}
              {remainingMonths} <span className="text-lg">months</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Target: {targetMonth} {targetYear}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Breakdown - Always Visible */}
      <div className="p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Required Corpus Breakdown */}
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Required Corpus
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                {formatFireCurrency(requiredCorpus)}
              </div>
            </div>

            <RequiredCorpusBreakdown
              postFireMonthlyExpense={postFireMonthlyExpense}
              currentMonthlyExpense={currentMonthlyExpense}
              lifestyleInflationAdjustment={lifestyleInflationAdjustment}
              yearsToFire={yearsToFire}
              safeWithdrawalRate={safeWithdrawalRate}
              corpusMultiplier={corpusMultiplier}
              requiredCorpus={requiredCorpus}
              fireAge={fireAge}
              currentAge={currentAge}
              dependents={dependents}
              savingsRate={savingsRate}
              fireLifestyleType={fireLifestyleType}
            />
          </div>

          {/* Projected Corpus Breakdown */}
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Projected Corpus
              </div>
              <div className={`text-3xl font-bold ${statusColors.accent} mb-4`}>
                {formatFireCurrency(projectedCorpusAtFire)}
              </div>
            </div>

            <ProjectedCorpusBreakdown
              currentNetworth={currentNetworth}
              monthlySavings={monthlySavings}
              yearsToFire={yearsToFire}
              projectedCorpusAtFire={projectedCorpusAtFire}
              fireAge={fireAge}
              currentAge={currentAge}
            />
          </div>
        </div>
      </div>

      {/* Action Summary - Always Visible */}
      <div className="px-8 pb-8">
        <div className={`p-4 rounded-lg ${statusColors.statusBg} border ${statusColors.statusBorder}`}>
          {isOnTrack ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-5 h-5 ${statusColors.icon} flex-shrink-0`} />
              <p className="text-sm" style={{ color: 'inherit', opacity: 0.95 }}>
                <strong>Surplus: {formatFireCurrency(absoluteGap)}</strong>
                {yearsEarlier > 0 ? (
                  <> • You could retire {yearsEarlier} {yearsEarlier === 1 ? 'year' : 'years'} earlier at age {newFireAge}, or maintain your timeline with a {safetyBufferYears}-year safety buffer</>
                ) : (
                  <> • This provides a {safetyBufferYears}-year safety buffer against market volatility</>
                )}
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 ${statusColors.icon} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'inherit', opacity: 0.95 }}>
                  <strong>Shortfall: {formatFireCurrency(absoluteGap)}</strong> • Save <strong>{formatFireCurrency(savingsIncrease)}</strong> more per month
                </p>
                <p className="text-xs mt-2" style={{ color: 'inherit', opacity: 0.8 }}>
                  Alternatives: Extend FIRE age by {Math.ceil(absoluteGap / (monthlySavings * 12))} years or reduce expenses by {Math.round((absoluteGap / requiredCorpus) * 100)}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
