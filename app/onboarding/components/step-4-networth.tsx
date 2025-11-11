'use client'

import { useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion } from 'framer-motion'
import { TrendingUp, Shield, Wallet, Home, Gem, Sparkles } from 'lucide-react'
import { ConversationStep } from './conversation-step'
import { AssetCategorySection } from './asset-category-section'
import { ProgressBar } from './progress-bar'
import { MicroFeedback } from './micro-feedback'
import { OnboardingData } from '../types'
import { scrollToPosition } from '../utils/scroll-helpers'
import { calculateAge, createDateFromYearMonth } from '@/app/utils/date-helpers'

interface Step4NetWorthProps {
  form: UseFormReturn<OnboardingData>
  navigationDirection: 'forward' | 'back' | null
}

// Format number with commas for Indian currency
function formatIndianCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

// Get allocation feedback based on age and asset mix
const getAllocationFeedback = (
  totalNetWorth: number,
  equityPercent: number,
  debtPercent: number,
  age: number
): { message: string; variant: 'success' | 'info' | 'tip' } => {
  if (totalNetWorth === 0) {
    return {
      message: 'No worries! Starting from scratch is perfectly fine - let\'s build your FIRE plan from here.',
      variant: 'tip',
    }
  }

  // Ideal equity allocation = 100 - age (with bounds)
  const idealEquity = Math.max(30, Math.min(70, 100 - age))
  const equityDiff = Math.abs(equityPercent - idealEquity)

  if (equityDiff <= 10) {
    return {
      message: 'Balanced portfolio! Your equity allocation aligns well with your age and risk profile.',
      variant: 'success',
    }
  }

  if (equityPercent < idealEquity - 10) {
    return {
      message: 'Consider increasing equity allocation for better long-term growth potential given your age.',
      variant: 'info',
    }
  }

  if (equityPercent > idealEquity + 10) {
    return {
      message: 'Strong equity allocation for aggressive growth! Ensure you\'re comfortable with the volatility.',
      variant: 'info',
    }
  }

  return {
    message: 'Good start! We\'ll help you optimize your asset allocation for your FIRE journey.',
    variant: 'success',
  }
}

export function Step4NetWorth({ form, navigationDirection }: Step4NetWorthProps) {
  // Watch form values
  const equity = form.watch('equity') || 0
  const debt = form.watch('debt') || 0
  const cash = form.watch('cash') || 0
  const realEstate = form.watch('real_estate') || 0
  const otherAssets = form.watch('other_assets') || 0
  const birthYear = form.watch('birth_year')
  const birthMonth = form.watch('birth_month')

  // Calculate age from birth year and month
  const age = birthYear && birthMonth
    ? calculateAge(createDateFromYearMonth(birthYear, birthMonth))
    : 30

  const totalNetWorth = equity + debt + cash + realEstate + otherAssets

  // Calculate percentages
  const equityPercent = totalNetWorth > 0 ? Math.round((equity / totalNetWorth) * 100) : 0
  const debtPercent = totalNetWorth > 0 ? Math.round((debt / totalNetWorth) * 100) : 0
  const cashPercent = totalNetWorth > 0 ? Math.round((cash / totalNetWorth) * 100) : 0
  const realEstatePercent = totalNetWorth > 0 ? Math.round((realEstate / totalNetWorth) * 100) : 0
  const otherPercent = totalNetWorth > 0 ? Math.round((otherAssets / totalNetWorth) * 100) : 0

  const allocationFeedback = getAllocationFeedback(totalNetWorth, equityPercent, debtPercent, age)

  // Contextual scroll based on navigation direction
  useEffect(() => {
    const hasPreFilledData = totalNetWorth > 0

    if (!hasPreFilledData) return

    if (navigationDirection === 'back') {
      scrollToPosition('top', { smooth: true, delay: 300 })
    } else if (navigationDirection === 'forward') {
      scrollToPosition('bottom', { smooth: true, delay: 300 })
    } else if (navigationDirection === null) {
      scrollToPosition('top', { smooth: true, delay: 300 })
    }
  }, [navigationDirection])

  // Asset options
  const equityOptions = [
    { value: '0', label: 'None' },
    { value: '100000', label: '₹1L' },
    { value: '500000', label: '₹5L' },
    { value: '1000000', label: '₹10L' },
    { value: '2500000', label: '₹25L' },
    { value: 'custom', label: 'Custom' },
  ]

  const debtOptions = [
    { value: '0', label: 'None' },
    { value: '50000', label: '₹50K' },
    { value: '200000', label: '₹2L' },
    { value: '500000', label: '₹5L' },
    { value: '1000000', label: '₹10L' },
    { value: 'custom', label: 'Custom' },
  ]

  const cashOptions = [
    { value: '0', label: 'None' },
    { value: '20000', label: '₹20K' },
    { value: '100000', label: '₹1L' },
    { value: '300000', label: '₹3L' },
    { value: '500000', label: '₹5L' },
    { value: 'custom', label: 'Custom' },
  ]

  const realEstateOptions = [
    { value: '0', label: 'None' },
    { value: '5000000', label: '₹50L' },
    { value: '10000000', label: '₹1Cr' },
    { value: '20000000', label: '₹2Cr' },
    { value: 'custom', label: 'Custom' },
  ]

  const otherOptions = [
    { value: '0', label: 'None' },
    { value: '50000', label: '₹50K' },
    { value: '200000', label: '₹2L' },
    { value: '500000', label: '₹5L' },
    { value: '1000000', label: '₹10L' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div className="space-y-6">
      {/* Main Question */}
      <ConversationStep
        question="What's your current net worth?"
        tooltip="Enter your current assets across different categories. This helps track your starting point for the FIRE journey."
        icon={<Sparkles className="w-4 h-4" strokeWidth={1.5} />}
        required={false}
      >
        <div className="space-y-0">
          {/* Equity */}
          <AssetCategorySection
            title="Equity"
            icon={TrendingUp}
            tooltip="Stocks, mutual funds, index funds, and equity investments"
            options={equityOptions}
            value={equity}
            onChange={(value) => form.setValue('equity', value, { shouldValidate: true })}
          />

          {/* Debt */}
          <AssetCategorySection
            title="Debt"
            icon={Shield}
            tooltip="Fixed deposits, PPF, EPF, bonds, and debt funds"
            options={debtOptions}
            value={debt}
            onChange={(value) => form.setValue('debt', value, { shouldValidate: true })}
          />

          {/* Cash */}
          <AssetCategorySection
            title="Cash"
            icon={Wallet}
            tooltip="Savings accounts, liquid funds, and emergency funds"
            options={cashOptions}
            value={cash}
            onChange={(value) => form.setValue('cash', value, { shouldValidate: true })}
          />

          {/* Real Estate */}
          <AssetCategorySection
            title="Real Estate"
            icon={Home}
            tooltip="Current market value of properties you own"
            options={realEstateOptions}
            value={realEstate}
            onChange={(value) => form.setValue('real_estate', value, { shouldValidate: true })}
          />

          {/* Other Assets */}
          <AssetCategorySection
            title="Other Assets"
            icon={Gem}
            tooltip="Gold, crypto, vehicles, and other investments"
            options={otherOptions}
            value={otherAssets}
            onChange={(value) => form.setValue('other_assets', value, { shouldValidate: true })}
          />
        </div>
      </ConversationStep>

      {/* Total Net Worth Summary */}
      {totalNetWorth > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring' }}
          className="p-6 bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950/40 dark:to-purple-900/40 border-2 border-violet-300 dark:border-violet-800/50 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-100 uppercase tracking-wide">
              Total Net Worth
            </h3>
          </div>

          {/* Total Amount */}
          <div className="mb-6">
            <p className="text-4xl font-bold text-violet-900 dark:text-violet-100">
              ₹{formatIndianCurrency(totalNetWorth)}
            </p>
          </div>

          {/* Asset Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-violet-800 dark:text-violet-200 mb-3">
              Asset Breakdown:
            </h4>

            {equity > 0 && (
              <ProgressBar
                label="Equity"
                value={equity}
                percentage={equityPercent}
                color="blue"
              />
            )}

            {debt > 0 && (
              <ProgressBar
                label="Debt"
                value={debt}
                percentage={debtPercent}
                color="emerald"
              />
            )}

            {cash > 0 && (
              <ProgressBar
                label="Cash"
                value={cash}
                percentage={cashPercent}
                color="yellow"
              />
            )}

            {realEstate > 0 && (
              <ProgressBar
                label="Real Estate"
                value={realEstate}
                percentage={realEstatePercent}
                color="orange"
              />
            )}

            {otherAssets > 0 && (
              <ProgressBar
                label="Other"
                value={otherAssets}
                percentage={otherPercent}
                color="purple"
              />
            )}
          </div>
        </motion.div>
      )}

      {/* Allocation Feedback */}
      <MicroFeedback message={allocationFeedback.message} variant={allocationFeedback.variant} />
    </div>
  )
}
