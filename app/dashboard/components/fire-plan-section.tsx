'use client';

import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';
import { RequiredCorpusBreakdown } from './required-corpus-breakdown';
import { ProjectedCorpusBreakdown } from './projected-corpus-breakdown';
import { motion } from 'framer-motion';

interface FirePlanSectionProps {
  requiredCorpus: number;
  projectedCorpusAtFire: number;
  currentNetworth: number;
  postFireMonthlyExpense: number;
  currentMonthlyExpense: number;
  monthlySavings: number;
  monthlySavingsNeeded: number;
  lifestyleInflationAdjustment: number;
  safeWithdrawalRate: number;
  yearsToFire: number;
  fireAge: number;
  currentAge: number;
  isOnTrack: boolean;
  dependents: number;
  savingsRate: number;
  fireLifestyleType: string;
}

export function FirePlanSection({
  requiredCorpus,
  projectedCorpusAtFire,
  currentNetworth,
  postFireMonthlyExpense,
  currentMonthlyExpense,
  monthlySavings,
  monthlySavingsNeeded,
  lifestyleInflationAdjustment,
  safeWithdrawalRate,
  yearsToFire,
  fireAge,
  currentAge,
  isOnTrack,
  dependents,
  savingsRate,
  fireLifestyleType,
}: FirePlanSectionProps) {
  // Calculate gap at FIRE age
  const gapAtFireAge = projectedCorpusAtFire - requiredCorpus;
  const absoluteGap = Math.abs(gapAtFireAge);
  const savingsIncrease = monthlySavingsNeeded - monthlySavings;

  // Calculate corpus multiplier from actual SWR (inverse relationship)
  // Example: 3.3% SWR (0.033) → 1 / 0.033 = 30.3x multiplier
  const corpusMultiplier = 1 / safeWithdrawalRate;

  // Status colors only (for bottom status box)
  const statusColors = isOnTrack
    ? {
        bg: 'bg-emerald-100 dark:bg-emerald-900/50',
        border: 'border-emerald-300 dark:border-emerald-700',
      }
    : {
        bg: 'bg-amber-100 dark:bg-amber-900/50',
        border: 'border-amber-300 dark:border-amber-700',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900/50 px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <Target className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Your FIRE Plan
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comparing your goal with projected wealth at age {fireAge}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Metrics: Required vs Projected */}
      <div className="px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">

          {/* Required Corpus */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Required Corpus
              </div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {formatFireCurrency(requiredCorpus)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                To sustain {fireLifestyleType} FIRE lifestyle
              </div>
            </div>

            {/* Breakdown Accordion */}
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

          {/* Projected Corpus */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Projected Corpus
              </div>
              <div className={`text-4xl font-bold ${isOnTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {formatFireCurrency(projectedCorpusAtFire)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Based on current savings trajectory
              </div>
            </div>

            {/* Breakdown Accordion */}
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

        {/* Status Line */}
        <div className={`mt-8 p-6 rounded-lg ${statusColors.bg} border ${statusColors.border}`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {isOnTrack ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>

            <div className="flex-1">
              {isOnTrack ? (
                <div>
                  <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                    You're on track!
                  </h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-2">
                    Your projected corpus of <strong>{formatFireCurrency(projectedCorpusAtFire)}</strong> exceeds
                    your required corpus by <strong>{formatFireCurrency(absoluteGap)}</strong>.
                    {gapAtFireAge > requiredCorpus * 0.2 && (
                      <span className="block mt-2">
                        💡 You might achieve FIRE earlier or consider upgrading to a more comfortable lifestyle!
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    Action needed to reach your goal
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-2">
                    You're projected to be <strong>{formatFireCurrency(absoluteGap)} short</strong> at age {fireAge}.
                  </p>
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Recommended Action:
                    </div>
                    <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                      Save {formatFireCurrency(savingsIncrease)} more per month
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Increase from {formatFireCurrency(monthlySavings)} to {formatFireCurrency(monthlySavingsNeeded)}/month
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                      <strong>Alternative options:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Extend FIRE age by {Math.ceil(absoluteGap / (monthlySavings * 12))} years</li>
                        <li>Reduce post-FIRE expenses by {Math.round((absoluteGap / requiredCorpus) * 100)}%</li>
                        <li>Aim for higher investment returns through optimized asset allocation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
