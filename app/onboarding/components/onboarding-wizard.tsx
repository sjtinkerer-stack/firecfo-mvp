'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Flame, ArrowLeft, ArrowRight, Loader2, Check, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { AnimatedBackground } from '@/components/ui/animated-background'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ProgressIndicator } from './progress-indicator'
import { Step1Personal } from './step-1-personal'
import { Step2Income } from './step-2-income'
import { Step3Expenses } from './step-3-expenses'
import { Step4NetWorth } from './step-4-networth'
import { Step5FireGoal } from './step-5-fire-goal'
import { useAutoSave } from '../hooks/use-auto-save'
import { onboardingSchema, type OnboardingData } from '../types'
import {
  calculateLifestyleInflationAdjustment,
  calculateFireMetrics,
} from '../utils/fire-calculations'
import {
  calculateAge,
  createDateFromYearMonth,
  calculateFireTargetDate,
  calculateYearsToFire,
} from '@/app/utils/date-helpers'

const TOTAL_STEPS = 5

export function OnboardingWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'back' | null>(null)
  const retryCountRef = useRef(0)
  const hasLoadedRef = useRef(false)
  const previousStepRef = useRef(1)

  // Initialize form with react-hook-form
  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      birth_year: undefined,
      birth_month: undefined,
      city: undefined,
      marital_status: undefined,
      dependents: undefined,
      monthly_income: undefined,
      spouse_income: 0,
      monthly_expenses: undefined,
      equity: 0,
      debt: 0,
      cash: 0,
      real_estate: 0,
      other_assets: 0,
      fire_target_age: undefined,
      fire_lifestyle_type: 'standard',
    },
    mode: 'onChange',
  })

  // Get form data for auto-save - watch specific fields instead of entire form
  const birth_year = useWatch({ control: form.control, name: 'birth_year' })
  const birth_month = useWatch({ control: form.control, name: 'birth_month' })
  const city = useWatch({ control: form.control, name: 'city' })
  const marital_status = useWatch({ control: form.control, name: 'marital_status' })
  const dependents = useWatch({ control: form.control, name: 'dependents' })
  const monthly_income = useWatch({ control: form.control, name: 'monthly_income' })
  const spouse_income = useWatch({ control: form.control, name: 'spouse_income' })
  const monthly_expenses = useWatch({ control: form.control, name: 'monthly_expenses' })
  const equity = useWatch({ control: form.control, name: 'equity' })
  const debt = useWatch({ control: form.control, name: 'debt' })
  const cash = useWatch({ control: form.control, name: 'cash' })
  const real_estate = useWatch({ control: form.control, name: 'real_estate' })
  const other_assets = useWatch({ control: form.control, name: 'other_assets' })
  const fire_target_age = useWatch({ control: form.control, name: 'fire_target_age' })
  const fire_lifestyle_type = useWatch({ control: form.control, name: 'fire_lifestyle_type' })

  // Compute age from DOB
  const age = birth_year && birth_month
    ? calculateAge(createDateFromYearMonth(birth_year, birth_month))
    : undefined

  // Compute fire_age from fire_target_age (for backwards compatibility)
  const fire_age = fire_target_age

  // Calculate FIRE metrics when relevant fields are available
  const calculatedMetrics = useMemo(() => {
    // Only calculate if we have all required fields for FIRE calculation
    if (!age || !fire_age || !fire_lifestyle_type || !monthly_expenses || !monthly_income) {
      return {}
    }

    // NEW: Calculate precise years to FIRE from dates (decimal for accuracy)
    const dateOfBirth = birth_year && birth_month
      ? createDateFromYearMonth(birth_year, birth_month)
      : null;

    const fireTargetDate = dateOfBirth && fire_target_age
      ? calculateFireTargetDate(dateOfBirth, fire_target_age)
      : null;

    // Use decimal years for precise inflation calculations
    const yearsToFire = fireTargetDate && dateOfBirth
      ? calculateYearsToFire(fireTargetDate) // Returns decimal (e.g., 14.25)
      : fire_age - age; // Fallback to integer if dates not available

    const householdIncome = (monthly_income || 0) + (spouse_income || 0)
    const monthlySavings = householdIncome - (monthly_expenses || 0)
    const savingsRate = householdIncome > 0 ? (monthlySavings / householdIncome) * 100 : 0
    const currentNetWorth = (equity || 0) + (debt || 0) + (cash || 0) + (real_estate || 0) + (other_assets || 0)

    // Calculate LIA
    const LIA = calculateLifestyleInflationAdjustment(
      age,
      dependents || 0,
      savingsRate,
      fire_lifestyle_type as 'lean' | 'standard' | 'fat'
    )

    // Calculate all FIRE metrics (now with decimal yearsToFire for precision)
    const metrics = calculateFireMetrics(
      age,
      fire_age,
      yearsToFire, // NEW PARAMETER: Decimal years for accurate inflation calculation
      monthly_expenses,
      currentNetWorth,
      monthlySavings,
      householdIncome,
      LIA
    )

    return {
      lifestyle_inflation_adjustment: LIA,
      safe_withdrawal_rate: metrics.safeWithdrawalRate,
      post_fire_monthly_expense: Math.round(metrics.postFireMonthlyExpense),
      required_corpus: Math.round(metrics.requiredCorpus),
      projected_corpus_at_fire: Math.round(metrics.projectedCorpusAtFire),
      monthly_savings_needed: Math.round(metrics.monthlySavingsNeeded),
      is_on_track: metrics.isOnTrack,
    }
  }, [
    age,
    fire_age,
    fire_target_age, // NEW DEPENDENCY: Needed for fireTargetDate calculation
    birth_year, // NEW DEPENDENCY: Needed for decimal yearsToFire calculation
    birth_month, // NEW DEPENDENCY: Needed for decimal yearsToFire calculation
    fire_lifestyle_type,
    monthly_expenses,
    monthly_income,
    spouse_income,
    dependents,
    equity,
    debt,
    cash,
    real_estate,
    other_assets,
  ])

  // Combine watched fields + calculated metrics into formData object
  // Transform birth_year/birth_month to date_of_birth (ISO string)
  const date_of_birth = birth_year && birth_month
    ? createDateFromYearMonth(birth_year, birth_month).toISOString().split('T')[0] // YYYY-MM-DD format
    : undefined

  // Transform fire_target_age to fire_target_date (ISO string)
  const fire_target_date = birth_year && birth_month && fire_target_age
    ? calculateFireTargetDate(createDateFromYearMonth(birth_year, birth_month), fire_target_age).toISOString().split('T')[0]
    : undefined

  const formData = {
    date_of_birth,
    fire_target_age,
    fire_target_date,
    city,
    marital_status,
    dependents,
    monthly_income,
    spouse_income,
    monthly_expenses,
    equity,
    debt,
    cash,
    real_estate,
    other_assets,
    fire_lifestyle_type,
    ...calculatedMetrics, // Include calculated FIRE metrics
  }

  // DEBUG: Track formData changes
  useEffect(() => {
    console.log('🔍 DEBUG [Wizard]: formData changed:', formData)
  }, [age, city, marital_status, dependents, monthly_income, spouse_income, monthly_expenses, equity, debt, cash, real_estate, other_assets, fire_age, fire_lifestyle_type, calculatedMetrics])

  // Auto-save hook
  const { isSaving, lastSaved, error: saveError, saveNow } = useAutoSave(
    formData,
    true, // enabled
    {
      delay: 1000, // 1 second debounce
      onSave: () => {
        console.log('✅ Data auto-saved successfully')
      },
      onError: (error) => {
        console.error('❌ Auto-save failed:', error)
      },
    }
  )

  // Load existing data on mount
  useEffect(() => {
    // Prevent running twice
    if (hasLoadedRef.current) return

    const maxRetries = 3
    let retryTimeout: NodeJS.Timeout

    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // Retry a few times to handle race condition with OAuth callback
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++
            console.log(`No user found, retrying... (${retryCountRef.current}/${maxRetries})`)
            retryTimeout = setTimeout(loadUserData, 500 * retryCountRef.current) // Exponential backoff
            return
          } else {
            // Only redirect to login after retries exhausted
            console.log('No user found after retries, redirecting to login')
            setIsInitialLoading(false)
            router.push('/login')
            return
          }
        }

        // Mark as loaded to prevent duplicate fetches
        hasLoadedRef.current = true

        // Fetch existing profile data
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          // If no profile exists yet, that's okay (new user or RLS issue)
          // Just don't pre-fill any data
        }

        // If user has already completed onboarding, redirect to dashboard
        if (profile && !error && profile.onboarding_completed) {
          console.log('Onboarding already completed, redirecting to dashboard')
          router.push('/dashboard')
          return
        }

        if (profile && !error) {
          // Convert date_of_birth back to birth_year and birth_month if it exists
          let birth_year = undefined
          let birth_month = undefined
          if (profile.date_of_birth) {
            const dob = new Date(profile.date_of_birth)
            birth_year = dob.getFullYear()
            birth_month = dob.getMonth() + 1 // getMonth() is 0-indexed
          }

          // Show resume banner if user has partial data
          const hasPartialData = !!(profile.date_of_birth || profile.city || profile.marital_status || profile.monthly_income)
          console.log('Profile loaded:', {
            hasPartialData,
            date_of_birth: profile.date_of_birth,
            birth_year,
            birth_month,
            city: profile.city,
            marital_status: profile.marital_status,
            monthly_income: profile.monthly_income,
            monthly_expenses: profile.monthly_expenses,
          })
          setShowResumeBanner(hasPartialData)

          // Pre-fill form with existing data
          form.reset({
            birth_year,
            birth_month,
            city: profile.city,
            marital_status: profile.marital_status,
            dependents: profile.dependents,
            monthly_income: profile.monthly_income,
            spouse_income: profile.spouse_income || 0,
            monthly_expenses: profile.monthly_expenses,
            equity: profile.equity || 0,
            debt: profile.debt || 0,
            cash: profile.cash || 0,
            real_estate: profile.real_estate || 0,
            other_assets: profile.other_assets || 0,
            fire_target_age: profile.fire_target_age,
            fire_lifestyle_type: profile.fire_lifestyle_type || 'standard',
          })

          // Calculate completed steps based on filled data and current step
          // Only mark a step as complete if ALL its fields are filled AND user is past that step
          const completed: number[] = []
          const step = parseInt(searchParams.get('step') || '1')

          if (profile.date_of_birth && profile.city && profile.marital_status !== undefined && profile.dependents !== undefined && step > 1) {
            completed.push(1)
          }
          if (profile.monthly_income && step > 2) {
            completed.push(2)
          }
          if (profile.monthly_expenses && step > 3) {
            completed.push(3)
          }
          // Step 4 is optional, so always mark it as completed if user is past it
          if (step > 4) {
            completed.push(4)
          }
          if (profile.fire_target_age && profile.fire_lifestyle_type && step > 5) {
            completed.push(5)
          }
          setCompletedSteps(completed)
        }

        // Loading complete
        setIsInitialLoading(false)
      } catch (error: unknown) {
        console.error('Error loading user data:', error)
        setIsInitialLoading(false)
      }
    }

    loadUserData()

    // Cleanup timeout on unmount
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
    }
  }, [form, router])

  // Sync step with URL
  useEffect(() => {
    const step = searchParams.get('step')
    if (step) {
      const stepNum = parseInt(step)
      if (stepNum >= 1 && stepNum <= TOTAL_STEPS) {
        setCurrentStep(stepNum)
      }
    }
  }, [searchParams])

  // Update URL when step changes
  const navigateToStep = (step: number) => {
    // Determine navigation direction
    const direction = step > previousStepRef.current ? 'forward' : 'back'
    setNavigationDirection(direction)
    previousStepRef.current = step

    setCurrentStep(step)
    router.push(`/onboarding?step=${step}`, { scroll: false })
  }

  // Validate current step using strict schemas
  const validateCurrentStep = async (): Promise<boolean> => {
    const formValues = form.getValues()

    switch (currentStep) {
      case 1: {
        // Use strict step1Schema for validation
        const { step1Schema } = await import('../types')
        const result = step1Schema.safeParse({
          birth_year: formValues.birth_year,
          birth_month: formValues.birth_month,
          city: formValues.city,
          marital_status: formValues.marital_status,
          dependents: formValues.dependents,
        })

        if (!result.success) {
          // Set errors on the form
          result.error.issues.forEach((issue) => {
            const path = issue.path[0] as keyof OnboardingData
            form.setError(path, { message: issue.message })
          })
          return false
        }
        return true
      }
      case 2: {
        // Use strict step2Schema for validation
        const { step2Schema } = await import('../types')
        const result = step2Schema.safeParse({
          monthly_income: formValues.monthly_income,
          spouse_income: formValues.spouse_income,
        })

        if (!result.success) {
          result.error.issues.forEach((issue) => {
            const path = issue.path[0] as keyof OnboardingData
            form.setError(path, { message: issue.message })
          })
          return false
        }
        return true
      }
      case 3: {
        // Use strict step3Schema for validation
        const { step3Schema } = await import('../types')
        const result = step3Schema.safeParse({
          monthly_expenses: formValues.monthly_expenses,
        })

        if (!result.success) {
          result.error.issues.forEach((issue) => {
            const path = issue.path[0] as keyof OnboardingData
            form.setError(path, { message: issue.message })
          })
          return false
        }
        return true
      }
      case 4: {
        // Step 4 is optional, no validation needed
        return true
      }
      case 5: {
        // Ensure fire_target_age is not null/undefined
        if (!formValues.fire_target_age) {
          form.setError('fire_target_age', { message: 'Please select your target FIRE age' })
          return false
        }

        // Use strict step5Schema for validation
        const { step5Schema } = await import('../types')
        const result = step5Schema.safeParse({
          fire_target_age: formValues.fire_target_age,
          fire_lifestyle_type: formValues.fire_lifestyle_type,
        })

        if (!result.success) {
          result.error.issues.forEach((issue) => {
            const path = issue.path[0] as keyof OnboardingData
            form.setError(path, { message: issue.message })
          })
          return false
        }

        // Compute current age from birth_year/birth_month
        const currentAge = formValues.birth_year && formValues.birth_month
          ? calculateAge(createDateFromYearMonth(formValues.birth_year, formValues.birth_month))
          : undefined

        // Additional validation: fire_target_age must be > current age
        if (formValues.fire_target_age && currentAge && formValues.fire_target_age <= currentAge) {
          form.setError('fire_target_age', { message: `FIRE age must be greater than your current age (${currentAge})` })
          return false
        }

        return true
      }
      default:
        return true
    }
  }

  // Check if current step is complete (all required fields filled)
  const isCurrentStepComplete = (): boolean => {
    switch (currentStep) {
      case 1:
        // Check for actual values, not just "not undefined" (handles null from DB)
        return !!(
          birth_year &&
          birth_month &&
          city &&
          marital_status &&
          dependents !== undefined &&
          dependents !== null
        )
      case 2:
        return !!(monthly_income && monthly_income > 0)
      case 3:
        return !!(monthly_expenses && monthly_expenses > 0)
      case 4:
        // Step 4 is optional, always return true
        return true
      case 5:
        return !!(fire_age && age && fire_age > age && fire_lifestyle_type)
      default:
        return true
    }
  }

  // Handle next step
  const handleNext = async () => {
    // Debug: Log current form values
    console.log('=== DEBUG: handleNext called ===')
    console.log('Current step:', currentStep)
    console.log('Form values:', form.getValues())
    console.log('Form errors:', form.formState.errors)

    const isValid = await validateCurrentStep()
    console.log('Validation result:', isValid)

    if (!isValid) {
      console.log('Validation failed. Errors:', form.formState.errors)
      return
    }

    // CRITICAL: Save data before navigating to ensure it's persisted
    console.log('🔍 DEBUG: Manually saving before navigation...')
    try {
      await saveNow()
      console.log('✅ Manual save completed')
    } catch (error) {
      console.error('❌ Manual save failed:', error)
      // Continue anyway - auto-save might have already saved it
    }

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep])
    }

    if (currentStep < TOTAL_STEPS) {
      navigateToStep(currentStep + 1)
    } else {
      // Final step - mark onboarding as completed and show success modal
      setIsSubmitting(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          // Store user name and email for success modal
          setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null)
          setUserEmail(user.email || '')

          const { error } = await supabase
            .from('user_profiles')
            .update({ onboarding_completed: true })
            .eq('id', user.id)

          if (error) {
            console.error('Error marking onboarding complete:', error)
          }

          // Show success modal
          setShowSuccessModal(true)

          // Auto-redirect after 4 seconds
          setTimeout(() => {
            router.push('/dashboard')
          }, 4000)
        }
      } catch (error: unknown) {
        console.error('Error completing onboarding:', error)
        // Fallback: redirect to dashboard anyway
        router.push('/dashboard')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  // Handle back step
  const handleBack = () => {
    if (currentStep > 1) {
      navigateToStep(currentStep - 1)
    }
  }

  // Handle skip (for steps 4-5)
  const handleSkip = () => {
    if (currentStep >= 4) {
      handleNext()
    }
  }

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Personal form={form} navigationDirection={navigationDirection} />
      case 2:
        return <Step2Income form={form} navigationDirection={navigationDirection} />
      case 3:
        return <Step3Expenses form={form} navigationDirection={navigationDirection} />
      case 4:
        return <Step4NetWorth form={form} navigationDirection={navigationDirection} />
      case 5:
        return <Step5FireGoal form={form} navigationDirection={navigationDirection} />
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Step {currentStep} coming soon...</p>
          </div>
        )
    }
  }

  // Show loading screen while initial data loads
  if (isInitialLoading) {
    return (
      <AnimatedBackground variant="auth">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white text-lg">Loading your profile...</p>
          </div>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground variant="auth">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">FireCFO</span>
          </Link>

          {/* Main Card */}
          <Card className="glass-card border border-white/20 shadow-2xl">
            <CardContent className="p-6 md:p-8">
              {/* Progress Indicator */}
              <ProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />

              {/* Resume Banner */}
              {showResumeBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        Welcome back!
                      </h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                        We've saved your progress. Continue where you left off to complete your FIRE plan.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Form */}
              <Form {...form}>
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-8">
                  {/* Step Content */}
                  <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

                  {/* Navigation Buttons */}
                  <div className="space-y-3 pt-6 border-t dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 1 || isSubmitting}
                        className="h-11"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>

                      <div className="flex items-center gap-3">
                      {/* Skip button for step 4 only (net worth is optional) */}
                      {currentStep === 4 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSkip}
                          disabled={isSubmitting}
                          className="text-muted-foreground"
                        >
                          Skip for now
                        </Button>
                      )}

                      {/* Next/Finish button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                type="submit"
                                className="btn-gradient text-white h-11 px-8"
                                disabled={isSubmitting || !isCurrentStepComplete()}
                                onClick={() => {
                                  console.log('=== DEBUG: Next button clicked ===')
                                  console.log('Form values:', form.getValues())
                                  console.log('Form errors:', form.formState.errors)
                                  console.log('Is form valid?:', form.formState.isValid)
                                }}
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : currentStep === TOTAL_STEPS ? (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Complete
                                  </>
                                ) : (
                                  <>
                                    Next
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                  </>
                                )}
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {!isCurrentStepComplete() && !isSubmitting && (
                            <TooltipContent side="top">
                              <p>Please complete all required fields to continue</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      </div>
                    </div>
                  </div>

                  {/* Auto-save indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    {isSaving && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1"
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving...
                      </motion.div>
                    )}
                    {!isSaving && lastSaved && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1 text-emerald-600"
                      >
                        <Check className="w-3 h-3" />
                        Changes saved
                      </motion.div>
                    )}
                    {saveError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-600"
                      >
                        Failed to save. Changes stored locally.
                      </motion.div>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security badge */}
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
            🔒 Your data is encrypted and secure
          </p>
        </div>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-full max-w-md"
              >
                <Card className="bg-white dark:bg-gray-900 border-2 border-emerald-500/50 shadow-2xl">
                  <CardContent className="p-8 text-center">
                    {/* Success Icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-6"
                    >
                      <Check className="w-10 h-10 text-white" />
                    </motion.div>

                    {/* Welcome Message */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Welcome to FireCFO{userName ? `, ${userName.split(' ')[0]}` : ''}!
                      </h2>
                      {userEmail && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{userEmail}</p>
                      )}
                      <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                        Your personalized FIRE plan is ready
                      </p>
                    </motion.div>

                    {/* Feature highlights */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-3 mb-6 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Track your progress toward financial independence
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Visualize your net worth growth over time
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Get personalized insights to reach your goals faster
                        </p>
                      </div>
                    </motion.div>

                    {/* Redirect message */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Taking you to your dashboard...</span>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedBackground>
  )
}
