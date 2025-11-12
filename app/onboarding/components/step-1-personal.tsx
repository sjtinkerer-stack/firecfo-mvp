'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion } from 'framer-motion'
import { User, MapPin, Users, Heart, Calendar } from 'lucide-react'
import { ConversationStep } from './conversation-step'
import { PillSelector } from './pill-selector'
import { MicroFeedback } from './micro-feedback'
import { OnboardingData, MONTHS } from '../types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { scrollToPosition } from '../utils/scroll-helpers'
import { calculateAge, createDateFromYearMonth } from '@/app/utils/date-helpers'

interface Step1PersonalProps {
  form: UseFormReturn<OnboardingData>
  navigationDirection: 'forward' | 'back' | null
}

// Micro-feedback messages based on selections
const getFeedback = {
  age: (age: number) => {
    if (age >= 18 && age <= 29) {
      return 'Great! You have time for aggressive growth strategies and higher equity allocation.'
    }
    if (age >= 30 && age <= 39) {
      return 'Perfect timing! This is an ideal age to accelerate your FIRE journey.'
    }
    if (age >= 40 && age <= 49) {
      return 'You\'re in your peak earning years - let\'s maximize your wealth building.'
    }
    if (age >= 50) {
      return 'It\'s never too late! We\'ll create a focused plan to reach your goals.'
    }
    return ''
  },
  maritalStatus: (status: string, dependents?: number) => {
    if (status === 'Single' && dependents === 0) {
      return 'Asset allocation can be more aggressive with no dependents.'
    }
    if (status === 'Married' && dependents && dependents > 0) {
      return `We'll factor in childcare and family medical corpus for ${dependents} dependent${dependents > 1 ? 's' : ''}.`
    }
    if (status === 'Married') {
      return 'We\'ll optimize for dual-income tax planning and joint wealth building.'
    }
    return 'Your financial plan will be tailored to your family situation.'
  },
  dependents: (count: number) => {
    if (count === 0) return 'More flexibility to take calculated investment risks.'
    if (count === 1) return 'We\'ll include education and healthcare planning for 1 dependent.'
    return `We'll factor in education corpus and family insurance for ${count} dependents.`
  },
}

export function Step1Personal({ form, navigationDirection }: Step1PersonalProps) {
  // Watch form values for reactivity
  const birthYear = form.watch('birth_year')
  const birthMonth = form.watch('birth_month')
  const city = form.watch('city')
  const maritalStatus = form.watch('marital_status')
  const dependents = form.watch('dependents')
  const errors = form.formState.errors

  const [showCitySearch, setShowCitySearch] = useState(false)

  // Calculate age from birth year and month
  const age = birthYear && birthMonth
    ? calculateAge(createDateFromYearMonth(birthYear, birthMonth))
    : undefined

  // Check if this step has pre-filled data (used to control auto-scroll behavior)
  const hasPreFilledData = !!(birthYear && birthMonth && city && maritalStatus !== undefined && dependents !== undefined)

  // Contextual scroll based on navigation direction for pre-filled data
  useEffect(() => {
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
  }, [navigationDirection, hasPreFilledData])

  // Top cities to show as pills
  const topCities = [
    { value: 'Mumbai', label: 'Mumbai' },
    { value: 'Bangalore', label: 'Bangalore' },
    { value: 'Delhi', label: 'Delhi' },
    { value: 'Pune', label: 'Pune' },
    { value: 'Hyderabad', label: 'Hyderabad' },
    { value: 'Chennai', label: 'Chennai' },
  ]

  // All cities excluding those already shown as pills
  const allCities = [
    'Noida', 'Gurgaon', 'Ghaziabad', 'Chandigarh', 'Jaipur', 'Lucknow',
    'Kochi', 'Coimbatore', 'Visakhapatnam',
    'Ahmedabad', 'Surat', 'Nagpur',
    'Kolkata', 'Bhubaneswar', 'Patna', 'Other',
  ]

  const handleCitySelect = (cityValue: string) => {
    if (cityValue === 'other') {
      form.setValue('city', 'Other', { shouldValidate: true })
      setShowCitySearch(true)
    } else {
      form.setValue('city', cityValue, { shouldValidate: true })
      setShowCitySearch(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Birth Year & Month Question */}
      <ConversationStep
        question="When were you born?"
        tooltip="We use this to calculate your age and optimize your asset allocation strategy"
        icon={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
        error={errors.birth_year?.message || errors.birth_month?.message}
        scrollOnMount={!hasPreFilledData}
      >
        <div className="space-y-5 max-w-lg mx-auto">
          {/* Date Input Card */}
          <div className="bg-white/50 dark:bg-gray-800/30 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3">
              {/* Birth Year Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span>Birth Year</span>
                </label>
                <Select
                  value={birthYear?.toString()}
                  onValueChange={(value) => {
                    form.setValue('birth_year', parseInt(value), { shouldValidate: true })
                    // Set default birth month if not already set
                    if (!birthMonth) {
                      form.setValue('birth_month', 7, { shouldValidate: true }) // Default to July
                    }
                  }}
                >
                  <SelectTrigger className="h-12 text-lg bg-white dark:bg-gray-900">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {Array.from({ length: 48 }, (_, i) => {
                      const year = new Date().getFullYear() - 18 - i // Ages 18-65
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Birth Month Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span>Birth Month</span>
                </label>
                <Select
                  value={birthMonth?.toString()}
                  onValueChange={(value) => {
                    form.setValue('birth_month', parseInt(value), { shouldValidate: true })
                  }}
                  disabled={!birthYear}
                >
                  <SelectTrigger className="h-12 text-lg bg-white dark:bg-gray-900">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Calculated Age Display */}
          {age && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800/30 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
                Your Current Age
              </p>
              <p className="text-5xl font-bold text-emerald-900 dark:text-emerald-100">
                {age}
                <span className="text-2xl font-medium text-emerald-600 dark:text-emerald-400 ml-2">
                  years
                </span>
              </p>
            </motion.div>
          )}
        </div>
        {age && age >= 18 && (
          <div className="mt-4">
            <MicroFeedback message={getFeedback.age(age)} variant="success" />
          </div>
        )}
      </ConversationStep>

      {/* City Question */}
      {age && (
        <ConversationStep
          question="Where do you live?"
          tooltip="City affects HRA and cost of living calculations"
          icon={<MapPin className="w-4 h-4" strokeWidth={1.5} />}
          error={errors.city?.message}
          scrollOnMount={!hasPreFilledData}
        >
          <div className="space-y-4">
            <PillSelector
              options={[
                ...topCities,
                { value: 'other', label: 'Other City' },
              ]}
              value={
                !city ? undefined :
                topCities.some((c) => c.value === city) ? city :
                'other'
              }
              onChange={handleCitySelect}
              columns={3}
              size="md"
            />
            {(showCitySearch || (city && !topCities.some((c) => c.value === city))) && (
              <div className="pt-2">
                <Select onValueChange={(value) => form.setValue('city', value, { shouldValidate: true })} value={city}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Search or select your city" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] text-lg min-w-[300px]">
                    {allCities.map((cityName) => (
                      <SelectItem key={cityName} value={cityName}>
                        {cityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ConversationStep>
      )}

      {/* Marital Status Question */}
      {age && city && (
        <ConversationStep
          question="What's your marital status?"
          tooltip="This helps us optimize tax planning and family protection"
          icon={<Heart className="w-4 h-4" strokeWidth={1.5} />}
          error={errors.marital_status?.message}
          scrollOnMount={!hasPreFilledData}
        >
          <PillSelector
            options={[
              { value: 'Single', label: 'Single' },
              { value: 'Married', label: 'Married' },
            ]}
            value={maritalStatus}
            onChange={(value) => {
              form.setValue('marital_status', value as 'Single' | 'Married', { shouldValidate: true })
              // Reset spouse income if switching to Single
              if (value === 'Single') {
                form.setValue('spouse_income', 0)
              }
            }}
            columns={2}
            size="lg"
          />
          {maritalStatus && (
            <div className="mt-4">
              <MicroFeedback
                message={getFeedback.maritalStatus(maritalStatus, dependents)}
                variant="info"
              />
            </div>
          )}
        </ConversationStep>
      )}

      {/* Dependents Question */}
      {age && city && maritalStatus && (
        <ConversationStep
          question="How many dependents do you have?"
          tooltip={
            maritalStatus === 'Single'
              ? 'This typically includes parents or siblings you support financially'
              : 'This includes children, parents, or other family members you support'
          }
          icon={<Users className="w-4 h-4" strokeWidth={1.5} />}
          error={errors.dependents?.message}
          scrollOnMount={!hasPreFilledData}
        >
          <PillSelector
            options={[
              { value: '0', label: 'None' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3+' },
            ]}
            value={dependents?.toString()}
            onChange={(value) => {
              const count = parseInt(value)
              form.setValue('dependents', count, { shouldValidate: true })
            }}
            columns={4}
            size="lg"
          />
          {dependents !== undefined && (
            <div className="mt-4">
              <MicroFeedback message={getFeedback.dependents(dependents)} variant="tip" />
            </div>
          )}
        </ConversationStep>
      )}
    </div>
  )
}
