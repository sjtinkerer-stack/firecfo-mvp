'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Receipt, TrendingUp, PiggyBank } from 'lucide-react'
import { ConversationStep } from './conversation-step'
import { PillSelector } from './pill-selector'
import { SuggestionCard } from './suggestion-card'
import { MicroFeedback } from './micro-feedback'
import { Input } from '@/components/ui/input'
import { OnboardingData } from '../types'
import { scrollToPosition } from '../utils/scroll-helpers'

interface Step3ExpensesProps {
  form: UseFormReturn<OnboardingData>
  navigationDirection: 'forward' | 'back' | null
}

// Format number with commas for Indian currency
function formatIndianCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

// Get savings rate feedback
const getSavingsRateFeedback = (savingsRate: number): { message: string; variant: 'success' | 'info' | 'tip' } => {
  if (savingsRate >= 50) {
    return {
      message: 'Exceptional! You\'re on the fast track to FIRE with this savings rate.',
      variant: 'success',
    }
  }
  if (savingsRate >= 40) {
    return {
      message: 'Excellent savings rate puts you ahead of 90% of Indians on the FIRE path!',
      variant: 'success',
    }
  }
  if (savingsRate >= 30) {
    return {
      message: 'Good progress! This savings rate can help you achieve FIRE in 15-20 years.',
      variant: 'info',
    }
  }
  if (savingsRate >= 20) {
    return {
      message: 'Consider optimizing expenses to boost your savings rate and accelerate your FIRE timeline.',
      variant: 'tip',
    }
  }
  return {
    message: 'Let\'s work on increasing your savings rate for faster FIRE - even small improvements compound over time.',
    variant: 'tip',
  }
}

export function Step3Expenses({ form, navigationDirection }: Step3ExpensesProps) {
  const [isCustom, setIsCustom] = useState(false)

  // Watch form values
  const monthlyExpenses = form.watch('monthly_expenses') || 0
  const monthlyIncome = form.watch('monthly_income') || 0
  const spouseIncome = form.watch('spouse_income') || 0
  const errors = form.formState.errors

  const totalHouseholdIncome = monthlyIncome + spouseIncome
  const suggestedExpenses = Math.round(totalHouseholdIncome * 0.6)
  const monthlySavings = totalHouseholdIncome - monthlyExpenses
  const annualSavings = monthlySavings * 12
  const savingsRate = totalHouseholdIncome > 0 ? Math.round((monthlySavings / totalHouseholdIncome) * 100) : 0

  const savingsFeedback = getSavingsRateFeedback(savingsRate)

  // Initialize custom state based on saved value
  useEffect(() => {
    const validOptions = ['20000', '50000', '100000', '200000']
    if (monthlyExpenses > 0 && !validOptions.includes(monthlyExpenses.toString())) {
      setIsCustom(true)
    }
  }, [])

  // Contextual scroll based on navigation direction
  useEffect(() => {
    const hasPreFilledData = !!(monthlyExpenses && monthlyExpenses > 0)

    if (!hasPreFilledData) return

    if (navigationDirection === 'back') {
      scrollToPosition('top', { smooth: true, delay: 300 })
    } else if (navigationDirection === 'forward') {
      scrollToPosition('bottom', { smooth: true, delay: 300 })
    } else if (navigationDirection === null) {
      scrollToPosition('top', { smooth: true, delay: 300 })
    }
  }, [navigationDirection, monthlyExpenses])

  // Expense options
  const expenseOptions = [
    { value: '20000', label: '₹20K' },
    { value: '50000', label: '₹50K' },
    { value: '100000', label: '₹1L' },
    { value: '200000', label: '₹2L' },
    { value: 'custom', label: 'Custom' },
  ]

  const handleExpenseSelect = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true)
    } else {
      setIsCustom(false)
      form.setValue('monthly_expenses', parseInt(value), { shouldValidate: true })
    }
  }

  const handleUseSuggestion = () => {
    setIsCustom(false)
    form.setValue('monthly_expenses', suggestedExpenses, { shouldValidate: true })
  }

  const getCurrentValue = () => {
    if (isCustom) return 'custom'
    const validOptions = ['20000', '50000', '100000', '200000']
    if (monthlyExpenses === 0) return undefined
    return validOptions.includes(monthlyExpenses.toString()) ? monthlyExpenses.toString() : 'custom'
  }

  // Validate expenses don't exceed income
  const expenseError = monthlyExpenses > totalHouseholdIncome
    ? `Expenses cannot exceed your income of ₹${formatIndianCurrency(totalHouseholdIncome)}`
    : errors.monthly_expenses?.message

  return (
    <div className="space-y-8">
      {/* Expenses Question */}
      <ConversationStep
        question="What are your average monthly expenses?"
        tooltip="Your average monthly spending including rent, bills, groceries, entertainment, and other expenses. This determines your required FIRE corpus."
        icon={<Receipt className="w-4 h-4" strokeWidth={1.5} />}
        error={expenseError}
      >
        <div className="space-y-5">
          {/* Suggestion Card */}
          <SuggestionCard
            suggestion={suggestedExpenses}
            label="Based on your income, we suggest 60% for expenses:"
            onAccept={handleUseSuggestion}
          />

          {/* Pills */}
          <PillSelector
            options={expenseOptions}
            value={getCurrentValue()}
            onChange={handleExpenseSelect}
            columns={3}
            size="md"
          />

          {/* Custom Input */}
          {isCustom && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                ₹
              </span>
              <Input
                type="number"
                placeholder="Enter amount"
                className="h-12 pl-8 text-lg"
                value={monthlyExpenses || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                  form.setValue('monthly_expenses', value, { shouldValidate: true })
                }}
              />
            </div>
          )}
        </div>
      </ConversationStep>

      {/* Savings Rate Card */}
      {monthlyExpenses > 0 && monthlyExpenses <= totalHouseholdIncome && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring' }}
          className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/40 border-2 border-emerald-300 dark:border-emerald-800/50 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">
              Your Savings Rate
            </h3>
          </div>
          <div className="space-y-3">
            {/* Savings Rate Percentage */}
            <div>
              <p className="text-5xl font-bold text-emerald-900 dark:text-emerald-100">
                {savingsRate}%
              </p>
            </div>
            {/* Monthly Savings */}
            <div className="flex items-baseline gap-2 text-emerald-800 dark:text-emerald-200">
              <span className="text-sm">You're saving:</span>
              <span className="text-xl font-semibold">
                ₹{formatIndianCurrency(monthlySavings)}/month
              </span>
            </div>
            {/* Annual Savings */}
            <div className="flex items-baseline gap-2 text-emerald-800 dark:text-emerald-200">
              <span className="text-sm">Annual Savings:</span>
              <span className="text-xl font-semibold">
                ₹{formatIndianCurrency(annualSavings)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Savings Rate Feedback */}
      {monthlyExpenses > 0 && monthlyExpenses <= totalHouseholdIncome && (
        <MicroFeedback message={savingsFeedback.message} variant={savingsFeedback.variant} />
      )}
    </div>
  )
}
