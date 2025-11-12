'use client'

import { useState, useEffect, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Target, Clock, TrendingUp, ChevronDown, ChevronUp, Calculator, AlertCircle, ArrowLeft } from 'lucide-react'
import { ConversationStep } from './conversation-step'
import { PillSelector } from './pill-selector'
import { MicroFeedback } from './micro-feedback'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { OnboardingData, FireLifestyleType } from '../types'
import { scrollToPosition } from '../utils/scroll-helpers'
import {
  calculateLifestyleInflationAdjustment,
  calculateFireMetrics,
  getLIABreakdown,
  formatFireCurrency,
  getFireTargetYear,
  FireMetrics,
} from '../utils/fire-calculations'
import {
  calculateAge,
  createDateFromYearMonth,
  calculateFireTargetDate,
  formatFireTargetDate,
  formatFireTargetYear,
} from '@/app/utils/date-helpers'

interface Step5FireGoalProps {
  form: UseFormReturn<OnboardingData>
  navigationDirection: 'forward' | 'back' | null
}

// Format number with commas for Indian currency
function formatIndianCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

// Get feedback based on FIRE feasibility
const getFireFeedback = (
  metrics: FireMetrics,
  lifestyleType: FireLifestyleType,
  currentNetWorth: number
): { message: string; variant: 'success' | 'info' | 'tip' } => {
  const { isOnTrack, yearsToFire, surplusDeficit } = metrics

  // Special messaging for starting from ₹0
  if (currentNetWorth === 0) {
    if (isOnTrack) {
      return {
        message: `Starting your FIRE journey from scratch! With ${formatFireCurrency(metrics.monthlySavings)}/month savings, you can build wealth from zero and achieve FIRE by age ${metrics.fireAge}.`,
        variant: 'success',
      }
    } else {
      return {
        message: `Building from ₹0 is achievable! Increase your monthly savings by ${formatFireCurrency(metrics.savingsIncrease)} or extend your timeline to reach ${lifestyleType.charAt(0).toUpperCase() + lifestyleType.slice(1)} FIRE.`,
        variant: 'tip',
      }
    }
  }

  // Standard messaging for existing net worth
  if (isOnTrack) {
    if (surplusDeficit > metrics.requiredCorpus * 0.2) {
      return {
        message: `Excellent! You'll exceed your goal. Consider retiring even earlier or upgrading to Fat FIRE!`,
        variant: 'success',
      }
    }
    if (yearsToFire < 8) {
      return {
        message: `Ambitious goal! You're on track for ${lifestyleType.charAt(0).toUpperCase() + lifestyleType.slice(1)} FIRE in ${yearsToFire} years.`,
        variant: 'success',
      }
    }
    return {
      message: `Great work! You're on track to achieve ${lifestyleType.charAt(0).toUpperCase() + lifestyleType.slice(1)} FIRE by ${metrics.fireAge}.`,
      variant: 'success',
    }
  } else {
    if (metrics.savingsIncrease > metrics.monthlySavings * 0.5) {
      return {
        message: `Consider: Reduce expenses, increase income, extend FIRE timeline, or try Lean FIRE instead.`,
        variant: 'tip',
      }
    }
    return {
      message: `You need to increase monthly savings by ${formatFireCurrency(metrics.savingsIncrease)} to reach your goal.`,
      variant: 'info',
    }
  }
}

export function Step5FireGoal({ form, navigationDirection }: Step5FireGoalProps) {
  const [showCalculationDetails, setShowCalculationDetails] = useState(false)

  // Watch form values
  const birthYear = form.watch('birth_year')
  const birthMonth = form.watch('birth_month')
  const dependents = form.watch('dependents') || 0
  const monthlyIncome = form.watch('monthly_income') || 0
  const spouseIncome = form.watch('spouse_income') || 0
  const monthlyExpenses = form.watch('monthly_expenses') || 0
  const equity = form.watch('equity') || 0
  const debt = form.watch('debt') || 0
  const cash = form.watch('cash') || 0
  const realEstate = form.watch('real_estate') || 0
  const otherAssets = form.watch('other_assets') || 0
  const fireTargetAge = form.watch('fire_target_age')
  const fireLifestyleType = form.watch('fire_lifestyle_type') || 'standard'
  const errors = form.formState.errors

  // Calculate age from DOB
  const age = birthYear && birthMonth
    ? calculateAge(createDateFromYearMonth(birthYear, birthMonth))
    : 30 // Default fallback

  // Use fireTargetAge or compute default
  const fireAge = fireTargetAge || Math.max(45, age + 15)

  // Calculate derived values
  const householdIncome = monthlyIncome + spouseIncome
  const monthlySavings = householdIncome - monthlyExpenses
  const savingsRate = householdIncome > 0 ? (monthlySavings / householdIncome) * 100 : 0
  const currentNetWorth = equity + debt + cash + realEstate + otherAssets

  // Initialize fire_target_age with smart default
  useEffect(() => {
    const currentFireAge = form.getValues('fire_target_age')
    // Set default if fire_target_age is null, undefined, 0, or less than/equal to current age
    if (!currentFireAge || currentFireAge <= age) {
      const defaultFireAge = Math.max(45, age + 15)
      form.setValue('fire_target_age', defaultFireAge, { shouldValidate: true })
    }
    if (!form.getValues('fire_lifestyle_type')) {
      form.setValue('fire_lifestyle_type', 'standard', { shouldValidate: true })
    }
  }, [age, form])

  // Compute fire_target_date from DOB + fire_target_age
  const fireTargetDate = useMemo(() => {
    if (!birthYear || !birthMonth || !fireAge) return undefined
    const dob = createDateFromYearMonth(birthYear, birthMonth)
    return calculateFireTargetDate(dob, fireAge)
  }, [birthYear, birthMonth, fireAge])

  // Calculate LIA and FIRE metrics
  const LIA = useMemo(() => {
    return calculateLifestyleInflationAdjustment(age, dependents, savingsRate, fireLifestyleType as FireLifestyleType)
  }, [age, dependents, savingsRate, fireLifestyleType])

  const fireMetrics = useMemo(() => {
    return calculateFireMetrics(
      age,
      fireAge,
      monthlyExpenses,
      currentNetWorth,
      monthlySavings,
      householdIncome,
      LIA
    )
  }, [age, fireAge, monthlyExpenses, currentNetWorth, monthlySavings, householdIncome, LIA])

  const liaBreakdown = useMemo(() => {
    return getLIABreakdown(age, dependents, savingsRate, fireLifestyleType as FireLifestyleType)
  }, [age, dependents, savingsRate, fireLifestyleType])

  const targetYear = getFireTargetYear(age, fireAge)
  const fireFeedback = getFireFeedback(fireMetrics, fireLifestyleType as FireLifestyleType, currentNetWorth)

  // Contextual scroll
  useEffect(() => {
    const hasPreFilledData = !!(fireAge && fireAge > age)

    if (!hasPreFilledData) return

    if (navigationDirection === 'back') {
      scrollToPosition('top', { smooth: true, delay: 300 })
    } else if (navigationDirection === 'forward') {
      scrollToPosition('bottom', { smooth: true, delay: 300 })
    } else if (navigationDirection === null) {
      scrollToPosition('top', { smooth: true, delay: 300 })
    }
  }, [navigationDirection, fireAge])

  // Validate fire_target_age > current age
  useEffect(() => {
    if (fireAge && fireAge <= age) {
      form.setError('fire_target_age', { message: `FIRE age must be greater than your current age (${age})` })
    } else {
      form.clearErrors('fire_target_age')
    }
  }, [fireAge, age, form])

  // Lifestyle options
  const lifestyleOptions = [
    { value: 'lean', label: 'Lean FIRE', description: 'Minimal expenses, frugal lifestyle' },
    { value: 'standard', label: 'Standard FIRE', description: 'Current lifestyle maintained' },
    { value: 'fat', label: 'Fat FIRE', description: 'Upgraded lifestyle with luxuries' },
  ]

  return (
    <div className="space-y-8">
      {/* FIRE Age Question */}
      <ConversationStep
        question="When do you want to achieve FIRE?"
        tooltip="Your target age for Financial Independence. The earlier you want to retire, the more aggressive your savings need to be."
        icon={<Target className="w-4 h-4" strokeWidth={1.5} />}
        error={errors.fire_target_age?.message}
      >
        <div className="space-y-5">
          {/* Age Input with Slider */}
          <div className="flex flex-col items-center space-y-4">
            <Input
              type="number"
              value={fireAge || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                form.setValue('fire_target_age', value, { shouldValidate: true })
              }}
              className="h-20 text-center text-4xl font-bold max-w-xs"
              placeholder="45"
            />
            <Slider
              value={[fireAge]}
              onValueChange={([value]) => form.setValue('fire_target_age', value, { shouldValidate: true })}
              min={age + 1}
              max={Math.min(80, age + 40)}
              step={1}
              className="w-full max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              Age range: {age + 1} - {Math.min(80, age + 40)} years
            </p>
          </div>

          {/* Years to FIRE Card */}
          {fireAge > age && fireTargetDate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, type: 'spring' }}
              className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-300 dark:border-blue-800/50 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                  You'll Achieve FIRE In
                </h4>
              </div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {fireMetrics.yearsToFire} years
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Target: Age {fireAge} in {formatFireTargetDate(fireTargetDate)} ({formatFireTargetYear(fireTargetDate)})
              </p>
            </motion.div>
          )}
        </div>
      </ConversationStep>

      {/* Starting from Zero Banner */}
      {fireAge > age && currentNetWorth === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 rounded-r-lg"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Starting from scratch
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You skipped net worth tracking. These calculations assume you're building wealth from ₹0 through savings alone.
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              <span className="font-medium">Use the Back button to add your current assets for more accurate projections</span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Lifestyle Type Question */}
      {fireAge > age && (
        <ConversationStep
          question="What's your FIRE lifestyle?"
          tooltip="Choose how you want to live after FIRE. This affects your required corpus calculation."
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
          required={false}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lifestyleOptions.map((option) => {
                const isSelected = fireLifestyleType === option.value

                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      form.setValue('fire_lifestyle_type', option.value as FireLifestyleType, {
                        shouldValidate: true,
                      })
                    }
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <h4 className="font-semibold text-lg mb-2">{option.label}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </motion.button>
                )
              })}
            </div>

            <MicroFeedback
              message={
                fireLifestyleType === 'lean'
                  ? 'Lean FIRE focuses on minimizing expenses for early retirement'
                  : fireLifestyleType === 'standard'
                  ? 'Standard FIRE maintains your current lifestyle in retirement'
                  : 'Fat FIRE allows for an upgraded lifestyle with travel and luxuries'
              }
              variant="info"
            />
          </div>
        </ConversationStep>
      )}

      {/* FIRE Breakdown Card */}
      {fireAge > age && fireLifestyleType && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring', delay: 0.1 }}
          className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border-2 border-gray-300 dark:border-gray-700 rounded-xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
              Your FIRE Plan
            </h3>
          </div>

          {/* Post-FIRE Expense */}
          <div>
            <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">Post-FIRE Monthly Expense</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              ₹{formatIndianCurrency(Math.round(fireMetrics.postFireMonthlyExpense))}
              <span className="text-base font-normal ml-2 text-gray-700 dark:text-gray-300">/ month</span>
            </p>
            <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
              (₹{formatIndianCurrency(monthlyExpenses)} current + {LIA}% lifestyle adj)
            </p>
          </div>

          <div className="h-px bg-gray-300 dark:bg-gray-700" />

          {/* Required Corpus */}
          <div>
            <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">Required FIRE Corpus</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {formatFireCurrency(fireMetrics.requiredCorpus)}
            </p>
          </div>

          {/* Current Net Worth - Hide when ₹0 */}
          {currentNetWorth > 0 && (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Current Net Worth</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {formatFireCurrency(fireMetrics.currentNetWorth)}
              </p>
            </div>
          )}

          {/* Corpus Gap - Hide when ₹0 (redundant with Required Corpus) */}
          {currentNetWorth > 0 && (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Corpus Gap</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {formatFireCurrency(fireMetrics.corpusGap)}
              </p>
            </div>
          )}

          <div className="h-px bg-gray-300 dark:bg-gray-700" />

          {/* Projection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              At your current savings rate of ₹{formatIndianCurrency(Math.round(fireMetrics.monthlySavings))}/month:
            </p>

            <div>
              <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">
                Projected Corpus in {fireMetrics.yearsToFire} years
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {formatFireCurrency(fireMetrics.projectedCorpusAtFire)}
                {fireMetrics.isOnTrack && (
                  <span className="text-lg ml-2 text-green-600 dark:text-green-400">✓</span>
                )}
              </p>
            </div>

            {/* Status Message */}
            <div
              className={`p-4 rounded-lg ${
                fireMetrics.isOnTrack
                  ? 'bg-green-100 dark:bg-green-950/30 border border-green-300 dark:border-green-800'
                  : 'bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800'
              }`}
            >
              {fireMetrics.isOnTrack ? (
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  ✅ You're ON TRACK to achieve FIRE!
                </p>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ You need to increase your savings
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Save ₹{formatIndianCurrency(Math.round(fireMetrics.monthlySavingsNeeded))}/month (increase by ₹
                    {formatIndianCurrency(Math.round(fireMetrics.savingsIncrease))}) to reach your goal
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Calculation Details */}
          <button
            type="button"
            onClick={() => setShowCalculationDetails(!showCalculationDetails)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Calculator className="w-4 h-4" />
            How we calculated this
            {showCalculationDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showCalculationDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-lg space-y-3 text-sm bg-gray-100 dark:bg-gray-900/30"
            >
              <div>
                <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Post-FIRE Expense:</p>
                <p className="text-gray-800 dark:text-gray-200">
                  Base monthly expense: ₹{formatIndianCurrency(monthlyExpenses)}
                </p>
                <p className="text-gray-800 dark:text-gray-200">Lifestyle inflation: +{LIA}%</p>
                <p className="text-gray-800 dark:text-gray-200">
                  = Post-FIRE expense: ₹{formatIndianCurrency(Math.round(fireMetrics.postFireMonthlyExpense))}
                </p>
              </div>

              <div>
                <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Required Corpus:</p>
                <p className="text-gray-800 dark:text-gray-200">
                  Annual expense: ₹{formatIndianCurrency(Math.round(fireMetrics.postFireAnnualExpense))}
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  Inflation adjusted ({fireMetrics.yearsToFire} yrs): ₹
                  {formatIndianCurrency(Math.round(fireMetrics.inflationAdjustedAnnualExpense))}
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  × {fireMetrics.corpusMultiplier.toFixed(1)} ({(fireMetrics.safeWithdrawalRate * 100).toFixed(1)}% SWR): {formatFireCurrency(fireMetrics.requiredCorpus)}
                </p>
                <p className="text-xs mt-1 italic text-gray-700 dark:text-gray-300">
                  {fireAge < 45 && '• Conservative 3.5% SWR for early retirement (longer withdrawal period)'}
                  {fireAge >= 45 && fireAge <= 55 && '• Standard 4% SWR for traditional retirement timeline'}
                  {fireAge > 55 && '• Optimistic 4.5% SWR for later retirement (shorter withdrawal period)'}
                </p>
              </div>

              <div>
                <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Lifestyle Adjustment Breakdown:
                </p>
                <p className="text-gray-800 dark:text-gray-200">• Base: {liaBreakdown.base}%</p>
                <p className="text-gray-800 dark:text-gray-200">
                  • Age factor ({age}): {liaBreakdown.ageFactor > 0 ? '+' : ''}
                  {liaBreakdown.ageFactor}%
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  • Dependents ({dependents}): {liaBreakdown.dependentsFactor > 0 ? '+' : ''}
                  {liaBreakdown.dependentsFactor}%
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  • Savings rate ({Math.round(savingsRate)}%): {liaBreakdown.savingsRateFactor > 0 ? '+' : ''}
                  {liaBreakdown.savingsRateFactor}%
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  • {fireLifestyleType.charAt(0).toUpperCase() + fireLifestyleType.slice(1)} FIRE:{' '}
                  {liaBreakdown.lifestyleMultiplier > 0 ? '+' : ''}
                  {liaBreakdown.lifestyleMultiplier}%
                </p>
                <p className="font-semibold mt-1 text-gray-800 dark:text-gray-200">
                  Total: {liaBreakdown.total}%
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Micro Feedback */}
      {fireAge > age && fireLifestyleType && (
        <MicroFeedback message={fireFeedback.message} variant={fireFeedback.variant} />
      )}
    </div>
  )
}
