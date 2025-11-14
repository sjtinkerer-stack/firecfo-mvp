'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';

interface ProjectedCorpusBreakdownProps {
  currentNetworth: number;
  monthlySavings: number;
  yearsToFire: number;
  projectedCorpusAtFire: number;
  fireAge: number;
  currentAge: number;
}

export function ProjectedCorpusBreakdown({
  currentNetworth,
  monthlySavings,
  yearsToFire,
  projectedCorpusAtFire,
  fireAge,
  currentAge,
}: ProjectedCorpusBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate intermediate values for educational display
  const preRetirementReturn = 0.12; // 12% annual return
  const monthlyRate = preRetirementReturn / 12;
  const totalMonths = yearsToFire * 12;

  // Future value of current assets: FV = PV × (1 + r)^n
  const futureValueOfAssets = currentNetworth * Math.pow(1 + preRetirementReturn, yearsToFire);

  // Future value of monthly savings (annuity): FV = PMT × (((1 + r)^n - 1) / r)
  const futureValueOfSavings =
    monthlySavings * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span>How we got to {formatFireCurrency(projectedCorpusAtFire)}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-6">

              {/* Timeline Header */}
              <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Wealth Growth Over {yearsToFire} Years (Age {currentAge} → {fireAge})
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Assuming 12% annual returns (equity-heavy portfolio)
                </p>
              </div>

              {/* Step 1: Current Assets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold">
                      1
                    </span>
                    Starting Point (Today)
                  </h4>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(currentNetworth)}
                  </span>
                </div>
                <div className="ml-8 text-xs text-gray-600 dark:text-gray-400">
                  <div>Your current net worth across all assets</div>
                  <div className="text-gray-500 dark:text-gray-500 mt-1">
                    (Equity + Debt + Cash + Real Estate + Other)
                  </div>
                </div>
              </div>

              {/* Arrow with growth indicator */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Growing @ 12% annually
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>

              {/* Step 2: Future Value of Current Assets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold">
                      2
                    </span>
                    Assets Grow To
                  </h4>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(futureValueOfAssets)}
                  </span>
                </div>
                <div className="ml-8 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Compound growth formula:</span>
                    <span className="font-mono text-[10px]">FV = PV × (1.12)^{yearsToFire}</span>
                  </div>
                  <div className="pt-2 italic text-gray-500 dark:text-gray-500">
                    ₹{currentNetworth.toLocaleString('en-IN')} × {Math.pow(1.12, yearsToFire).toFixed(2)} = ₹{futureValueOfAssets.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              {/* Step 3: Monthly Savings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold">
                      3
                    </span>
                    Monthly Savings
                  </h4>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(monthlySavings)}/mo
                  </span>
                </div>
                <div className="ml-8 text-xs text-gray-600 dark:text-gray-400">
                  <div>Saved consistently for {totalMonths} months ({yearsToFire} years)</div>
                </div>
              </div>

              {/* Arrow with growth indicator */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Compounding @ 12% annually
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>

              {/* Step 4: Future Value of Savings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold">
                      4
                    </span>
                    Savings Accumulate To
                  </h4>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(futureValueOfSavings)}
                  </span>
                </div>
                <div className="ml-8 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Annuity formula:</span>
                    <span className="font-mono text-[10px]">FV = PMT × (((1+r)^n - 1) / r)</span>
                  </div>
                  <div className="pt-2 text-gray-500 dark:text-gray-500">
                    <div>Where:</div>
                    <div className="ml-2">• PMT = ₹{monthlySavings.toLocaleString('en-IN')}/month</div>
                    <div className="ml-2">• r = {(monthlyRate * 100).toFixed(2)}% monthly</div>
                    <div className="ml-2">• n = {totalMonths} months</div>
                  </div>
                </div>
              </div>

              {/* Final Total */}
              <div className="pt-4 border-t-2 border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-600 dark:bg-gray-500 text-white text-sm font-bold">
                      ∑
                    </span>
                    Total at Age {fireAge}
                  </h4>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(projectedCorpusAtFire)}
                  </span>
                </div>
                <div className="ml-9 mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                  {formatFireCurrency(futureValueOfAssets)} (assets) + {formatFireCurrency(futureValueOfSavings)} (savings) = {formatFireCurrency(projectedCorpusAtFire)}
                </div>
              </div>

              {/* Summary */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="bg-gray-100 dark:bg-gray-800/30 rounded-lg p-4">
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Key Insight:</strong> Your wealth grows from two sources:
                    <div className="mt-2 space-y-1">
                      <div>1. <strong>Existing assets</strong> compound to {formatFireCurrency(futureValueOfAssets)}</div>
                      <div>2. <strong>Regular savings</strong> accumulate to {formatFireCurrency(futureValueOfSavings)}</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      By age {fireAge}, you'll have <strong>{formatFireCurrency(projectedCorpusAtFire)}</strong> assuming current savings continue.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
