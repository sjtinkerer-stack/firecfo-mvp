'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { User, MapPin, Users, Heart, Calendar } from 'lucide-react'
import { ConversationStep } from './conversation-step'
import { PillSelector } from './pill-selector'
import { MicroFeedback } from './micro-feedback'
import { OnboardingData } from '../types'
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
  const age = form.watch('age')
  const city = form.watch('city')
  const maritalStatus = form.watch('marital_status')
  const dependents = form.watch('dependents')
  const errors = form.formState.errors

  const [showCitySearch, setShowCitySearch] = useState(false)

  // Check if this step has pre-filled data (used to control auto-scroll behavior)
  const hasPreFilledData = !!(age && city && maritalStatus !== undefined && dependents !== undefined)

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
      {/* Age Question */}
      <ConversationStep
        question="What's your age?"
        tooltip="Age influences your ideal asset allocation strategy"
        icon={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
        error={errors.age?.message}
        scrollOnMount={!hasPreFilledData}
      >
        <div className="space-y-6 max-w-xs mx-auto">
          {/* Age input with slider */}
          <div className="flex flex-col gap-6">
            {/* Direct input field */}
            <div className="relative">
              <Input
                type="number"
                min={18}
                max={65}
                placeholder="Enter your age"
                value={age || ''}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow empty input
                  if (value === '') {
                    form.setValue('age', undefined, { shouldValidate: true })
                    return
                  }
                  // Allow typing intermediate values (like "2" when typing "25")
                  const numValue = parseInt(value)
                  if (!isNaN(numValue)) {
                    form.setValue('age', numValue, { shouldValidate: true })
                  }
                }}
                onBlur={(e) => {
                  // On blur, enforce min/max constraints
                  const value = parseInt(e.target.value)
                  if (!isNaN(value)) {
                    if (value < 18) {
                      form.setValue('age', 18, { shouldValidate: true })
                    } else if (value > 65) {
                      form.setValue('age', 65, { shouldValidate: true })
                    }
                  }
                }}
                className="h-20 text-3xl font-bold text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-2 transition-all hover:border-primary/50 focus:border-primary"
              />
              <div className="absolute -bottom-6 left-0 right-0 text-center">
                <span className="text-sm text-muted-foreground">years old</span>
              </div>
            </div>

            {/* Slider */}
            <div className="w-full pt-4">
              <Slider
                min={18}
                max={65}
                step={1}
                value={age ? [age] : [18]}
                onValueChange={(values) => {
                  form.setValue('age', values[0], { shouldValidate: true })
                }}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>18</span>
                <span>65</span>
              </div>
            </div>
          </div>
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
