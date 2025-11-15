'use client'

import { useState, useEffect, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Target, TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react'
import { ConversationStep } from './conversation-step'
import { PillSelector } from './pill-selector'
import { MicroFeedback } from './micro-feedback'
import { FireStatusBanner } from '@/app/dashboard/components/fire-status-banner'
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
  calculateYearsToFire,
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
    // When not on track, banner already shows specific savings gap
    // Micro feedback should provide encouragement or alternative strategies
    if (metrics.savingsIncrease > metrics.monthlySavings * 0.5) {
      return {
        message: `Consider: Reduce expenses, increase income, extend FIRE timeline, or try Lean FIRE instead.`,
        variant: 'tip',
      }
    }
    return {
      message: `Don't worry - small adjustments to your savings or timeline can get you back on track!`,
      variant: 'info',
    }
  }
}

export function Step5FireGoal({ form, navigationDirection }: Step5FireGoalProps) {
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

  // Calculate decimal years to FIRE from dates (for precise inflation calculations)
  const yearsToFire = useMemo(() => {
    if (!birthYear || !birthMonth || !fireAge || !fireTargetDate) {
      return fireAge - age // Fallback to integer calculation
    }
    return calculateYearsToFire(fireTargetDate) // Returns decimal (e.g., 14.25)
  }, [birthYear, birthMonth, fireAge, fireTargetDate, age])

  // Calculate LIA and FIRE metrics
  const LIA = useMemo(() => {
    return calculateLifestyleInflationAdjustment(age, dependents, savingsRate, fireLifestyleType as FireLifestyleType)
  }, [age, dependents, savingsRate, fireLifestyleType])

  const fireMetrics = useMemo(() => {
    return calculateFireMetrics(
      age,
      fireAge,
      yearsToFire,
      monthlyExpenses,
      currentNetWorth,
      monthlySavings,
      householdIncome,
      LIA
    )
  }, [age, fireAge, yearsToFire, monthlyExpenses, currentNetWorth, monthlySavings, householdIncome, LIA])

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

      {/* FIRE Status Banner */}
      {fireAge > age && fireLifestyleType && fireTargetDate && (
        <FireStatusBanner
          isOnTrack={fireMetrics.isOnTrack}
          fireAge={fireAge}
          fireTargetDate={fireTargetDate.toISOString()}
          fireLifestyleType={fireLifestyleType as FireLifestyleType}
          yearsToFire={yearsToFire}
          monthlySavingsNeeded={fireMetrics.monthlySavingsNeeded}
          currentMonthlySavings={monthlySavings}
        />
      )}

      {/* Micro Feedback */}
      {fireAge > age && fireLifestyleType && (
        <MicroFeedback message={fireFeedback.message} variant={fireFeedback.variant} />
      )}
    </div>
  )
}
