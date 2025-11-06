'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, IndianRupee, Users } from 'lucide-react'
import { ConversationStep } from './conversation-step'
import { PillSelector } from './pill-selector'
import { MicroFeedback } from './micro-feedback'
import { Input } from '@/components/ui/input'
import { OnboardingData } from '../types'
import { scrollToPosition } from '../utils/scroll-helpers'

interface Step2IncomeProps {
  form: UseFormReturn<OnboardingData>
  navigationDirection: 'forward' | 'back' | null
}

// Format number with commas for Indian currency
function formatIndianCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

// Get income range feedback
const getIncomeFeedback = (income: number): string => {
  if (income < 50000) return 'Focus on building an emergency fund first, then start your FIRE journey.'
  if (income >= 50000 && income < 100000) return 'Good foundation for FIRE planning with disciplined saving.'
  if (income >= 100000 && income < 200000) return 'Strong FIRE potential - let\'s optimize your tax and investments.'
  return 'Excellent position for early FIRE with aggressive wealth building strategies.'
}

export function Step2Income({ form, navigationDirection }: Step2IncomeProps) {
  const [isIncomeCustom, setIsIncomeCustom] = useState(false)
  const [isSpouseIncomeCustom, setIsSpouseIncomeCustom] = useState(false)

  // Watch form values for reactivity
  const monthlyIncome = form.watch('monthly_income') || 0
  const spouseIncome = form.watch('spouse_income') || 0
  const maritalStatus = form.watch('marital_status')
  const errors = form.formState.errors
  const totalHouseholdIncome = monthlyIncome + spouseIncome
  const annualIncome = totalHouseholdIncome * 12

  // Contextual scroll based on navigation direction for pre-filled data
  useEffect(() => {
    // Check if this step has pre-filled data
    const hasPreFilledData = !!(monthlyIncome && monthlyIncome > 0)

    if (!hasPreFilledData) return // No scroll needed for empty form

    // Determine scroll position based on navigation direction
    if (navigationDirection === 'back') {
      // User navigated back - scroll to top so they can review/edit
      scrollToPosition('top', { smooth: true, delay: 300 })
    } else if (navigationDirection === 'forward') {
      // User navigated forward - they've already seen this, scroll to bottom (near Next button)
      scrollToPosition('bottom', { smooth: true, delay: 300 })
    } else if (navigationDirection === null) {
      // Initial load with pre-filled data - scroll to top so user can review
      scrollToPosition('top', { smooth: true, delay: 300 })
    }
  }, [navigationDirection, monthlyIncome])

  // Quick select income options
  const incomeOptions = [
    { value: '50000', label: '₹50K' },
    { value: '100000', label: '₹1L' },
    { value: '200000', label: '₹2L' },
    { value: '500000', label: '₹5L' },
    { value: 'custom', label: 'Custom' },
  ]

  const spouseIncomeOptions = [
    { value: '0', label: 'None' },
    { value: '50000', label: '₹50K' },
    { value: '100000', label: '₹1L' },
    { value: '200000', label: '₹2L' },
    { value: 'custom', label: 'Custom' },
  ]

  const handleIncomeSelect = (value: string) => {
    if (value === 'custom') {
      setIsIncomeCustom(true)
    } else {
      setIsIncomeCustom(false)
      form.setValue('monthly_income', parseInt(value), { shouldValidate: true })
    }
  }

  const handleSpouseIncomeSelect = (value: string) => {
    if (value === 'custom') {
      setIsSpouseIncomeCustom(true)
    } else {
      setIsSpouseIncomeCustom(false)
      form.setValue('spouse_income', parseInt(value), { shouldValidate: true })
    }
  }

  const getCurrentIncomeValue = () => {
    if (isIncomeCustom) return 'custom'
    const validOptions = ['50000', '100000', '200000', '500000']
    if (monthlyIncome === 0) return undefined
    return validOptions.includes(monthlyIncome.toString()) ? monthlyIncome.toString() : 'custom'
  }

  const getCurrentSpouseIncomeValue = () => {
    if (isSpouseIncomeCustom) return 'custom'
    const validOptions = ['0', '50000', '100000', '200000']
    return validOptions.includes(spouseIncome.toString()) ? spouseIncome.toString() : undefined
  }

  return (
    <div className="space-y-8">
      {/* Your Income Question */}
      <ConversationStep
        question="What's your monthly in-hand income?"
        tooltip="Your salary after tax deductions - this is the foundation for calculating your FIRE number"
        icon={<IndianRupee className="w-4 h-4" strokeWidth={1.5} />}
        error={errors.monthly_income?.message}
      >
        <div className="space-y-4">
          <PillSelector
            options={incomeOptions}
            value={getCurrentIncomeValue()}
            onChange={handleIncomeSelect}
            columns={3}
            size="md"
          />
          {isIncomeCustom && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                ₹
              </span>
              <Input
                type="number"
                placeholder="Enter amount"
                className="h-12 pl-8 text-lg"
                value={monthlyIncome || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                  form.setValue('monthly_income', value, { shouldValidate: true })
                }}
              />
            </div>
          )}
          {monthlyIncome >= 10000 && (
            <MicroFeedback message={getIncomeFeedback(monthlyIncome)} variant="success" />
          )}
        </div>
      </ConversationStep>

      {/* Spouse Income Question */}
      {monthlyIncome > 0 && maritalStatus === 'Married' && (
        <ConversationStep
          question="What's your spouse's monthly income?"
          tooltip="Enter your spouse's monthly income (optional - leave at 0 if not working)"
          icon={<Users className="w-4 h-4" strokeWidth={1.5} />}
          required={false}
          error={errors.spouse_income?.message}
        >
          <div className="space-y-4">
            <PillSelector
              options={spouseIncomeOptions}
              value={getCurrentSpouseIncomeValue()}
              onChange={handleSpouseIncomeSelect}
              columns={3}
              size="md"
            />
            {isSpouseIncomeCustom && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  ₹
                </span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  className="h-12 pl-8 text-lg"
                  value={spouseIncome || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                    form.setValue('spouse_income', value, { shouldValidate: true })
                  }}
                />
              </div>
            )}
            {spouseIncome > 0 && (
              <MicroFeedback
                message="Great! We'll optimize for dual-income tax planning and joint wealth building."
                variant="info"
              />
            )}
          </div>
        </ConversationStep>
      )}

      {/* Total Household Income Summary */}
      {totalHouseholdIncome > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring' }}
          className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/40 border-2 border-emerald-300 dark:border-emerald-800/50 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">
              Total Household Income
            </h3>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                ₹{formatIndianCurrency(totalHouseholdIncome)}
                <span className="text-base font-normal text-emerald-700 dark:text-emerald-300 ml-2">/ month</span>
              </p>
            </div>
            <div className="flex items-baseline gap-2 text-emerald-800 dark:text-emerald-200">
              <span className="text-sm">Annual:</span>
              <span className="text-xl font-semibold">
                ₹{formatIndianCurrency(annualIncome)}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
