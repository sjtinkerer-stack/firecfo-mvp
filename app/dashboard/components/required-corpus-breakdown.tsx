'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';

interface RequiredCorpusBreakdownProps {
  postFireMonthlyExpense: number;
  currentMonthlyExpense: number;
  lifestyleInflationAdjustment: number;
  yearsToFire: number;
  safeWithdrawalRate: number;
  corpusMultiplier: number;
  requiredCorpus: number;
  fireAge: number;
  currentAge: number;
  dependents: number;
  savingsRate: number;
  fireLifestyleType: string;
}

export function RequiredCorpusBreakdown({
  postFireMonthlyExpense,
  currentMonthlyExpense,
  lifestyleInflationAdjustment,
  yearsToFire,
  safeWithdrawalRate,
  corpusMultiplier,
  requiredCorpus,
  fireAge,
  currentAge,
  dependents,
  savingsRate,
  fireLifestyleType,
}: RequiredCorpusBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLIADetails, setShowLIADetails] = useState(false);

  // Calculate intermediate values
  const postFireAnnualExpense = postFireMonthlyExpense * 12;
  const inflationRate = 0.06; // 6% annual inflation
  const inflationMultiplier = Math.pow(1 + inflationRate, yearsToFire);
  const inflationAdjustedAnnualExpense = postFireAnnualExpense * inflationMultiplier;

  // LIA factor breakdown
  const getLIAFactors = () => {
    const base = 8;

    // Age factor
    let ageFactor = 0;
    if (currentAge <= 30) ageFactor = 3;
    else if (currentAge <= 35) ageFactor = 2;
    else if (currentAge <= 40) ageFactor = 1;
    else if (currentAge <= 45) ageFactor = 0;
    else if (currentAge <= 50) ageFactor = -1;
    else ageFactor = -2;

    // Dependents factor
    let dependentsFactor = 0;
    if (dependents === 0) dependentsFactor = 0;
    else if (dependents === 1) dependentsFactor = 2;
    else if (dependents === 2) dependentsFactor = 3;
    else dependentsFactor = 5;

    // Savings rate factor
    let savingsRateFactor = 0;
    if (savingsRate >= 50) savingsRateFactor = -5;
    else if (savingsRate >= 40) savingsRateFactor = -3;
    else if (savingsRate >= 30) savingsRateFactor = -1;
    else if (savingsRate >= 20) savingsRateFactor = 1;
    else if (savingsRate >= 10) savingsRateFactor = 3;
    else savingsRateFactor = 5;

    // Lifestyle factor
    let lifestyleFactor = 0;
    if (fireLifestyleType === 'lean') lifestyleFactor = -5;
    else if (fireLifestyleType === 'standard') lifestyleFactor = 0;
    else if (fireLifestyleType === 'fat') lifestyleFactor = 10;

    return { base, ageFactor, dependentsFactor, savingsRateFactor, lifestyleFactor };
  };

  const liaFactors = getLIAFactors();

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span>How we got to {formatFireCurrency(requiredCorpus)}</span>
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

              {/* Step 1: Post-FIRE Monthly Expense */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    1. Post-FIRE Monthly Expense
                  </h4>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(postFireMonthlyExpense)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Current monthly expense:</span>
                    <span className="font-medium">{formatFireCurrency(currentMonthlyExpense)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Lifestyle Inflation Adjustment:</span>
                    <span className="font-medium">+{lifestyleInflationAdjustment.toFixed(1)}%</span>
                  </div>

                  {/* LIA Breakdown Expandable */}
                  <button
                    onClick={() => setShowLIADetails(!showLIADetails)}
                    className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:underline mt-2"
                  >
                    <Info className="w-3 h-3" />
                    <span>{showLIADetails ? 'Hide' : 'Show'} LIA breakdown</span>
                  </button>

                  <AnimatePresence>
                    {showLIADetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 ml-4 space-y-1 text-xs"
                      >
                        <div className="flex justify-between">
                          <span>• Base:</span>
                          <span>{liaFactors.base}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Age factor ({currentAge}y):</span>
                          <span>{liaFactors.ageFactor > 0 ? '+' : ''}{liaFactors.ageFactor}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Dependents ({dependents}):</span>
                          <span>{liaFactors.dependentsFactor > 0 ? '+' : ''}{liaFactors.dependentsFactor}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Savings rate ({savingsRate.toFixed(0)}%):</span>
                          <span>{liaFactors.savingsRateFactor > 0 ? '+' : ''}{liaFactors.savingsRateFactor}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• {fireLifestyleType.charAt(0).toUpperCase() + fireLifestyleType.slice(1)} FIRE:</span>
                          <span>{liaFactors.lifestyleFactor > 0 ? '+' : ''}{liaFactors.lifestyleFactor}%</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-semibold">
                          <span>Total:</span>
                          <span>{lifestyleInflationAdjustment.toFixed(1)}%</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-2 text-xs italic text-gray-500 dark:text-gray-500">
                    ₹{currentMonthlyExpense.toLocaleString('en-IN')} × (1 + {lifestyleInflationAdjustment.toFixed(1)}%) = ₹{postFireMonthlyExpense.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>

              {/* Step 2: Annual Expense */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    2. Annual Expense
                  </h4>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(postFireAnnualExpense)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <div className="italic">
                    ₹{postFireMonthlyExpense.toLocaleString('en-IN')}/month × 12 = ₹{postFireAnnualExpense.toLocaleString('en-IN')}/year
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>

              {/* Step 3: Inflation Adjustment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    3. Inflation-Adjusted (at Age {fireAge})
                  </h4>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(inflationAdjustedAnnualExpense)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Years to FIRE:</span>
                    <span className="font-medium">{yearsToFire} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual inflation:</span>
                    <span className="font-medium">6%</span>
                  </div>
                  <div className="pt-2 italic">
                    ₹{postFireAnnualExpense.toLocaleString('en-IN')} × (1.06)^{yearsToFire} = ₹{inflationAdjustedAnnualExpense.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>

              {/* Step 4: Apply SWR Multiplier */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    4. Apply Safety Buffer
                  </h4>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatFireCurrency(requiredCorpus)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Safe Withdrawal Rate:</span>
                    <span className="font-medium">{(safeWithdrawalRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Corpus multiplier:</span>
                    <span className="font-medium">{corpusMultiplier}x</span>
                  </div>
                  <div className="pt-2 text-xs text-gray-500 dark:text-gray-500">
                    {fireAge < 45 && '🛡️ Conservative rate for early FIRE (longer withdrawal period)'}
                    {fireAge >= 45 && fireAge <= 55 && '✓ Standard Trinity Study rate (~30 year horizon)'}
                    {fireAge > 55 && '📈 Optimistic rate for shorter withdrawal period'}
                  </div>
                  <div className="pt-2 italic">
                    ₹{inflationAdjustedAnnualExpense.toLocaleString('en-IN')} × {corpusMultiplier} = ₹{requiredCorpus.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="bg-gray-100 dark:bg-gray-800/30 rounded-lg p-4">
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Bottom line:</strong> To sustain {formatFireCurrency(postFireMonthlyExpense)}/month
                    in {fireLifestyleType} FIRE lifestyle starting at age {fireAge},
                    you need a corpus of <strong>{formatFireCurrency(requiredCorpus)}</strong>.
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
