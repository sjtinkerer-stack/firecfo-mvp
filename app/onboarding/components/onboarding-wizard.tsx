'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { useAutoSave } from '../hooks/use-auto-save'
import { onboardingSchema, type OnboardingData } from '../types'

const TOTAL_STEPS = 5

export function OnboardingWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'back' | null>(null)
  const retryCountRef = useRef(0)
  const hasLoadedRef = useRef(false)
  const previousStepRef = useRef(1)

  // Initialize form with react-hook-form
  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      age: undefined,
      city: undefined,
      marital_status: undefined,
      dependents: undefined,
      monthly_income: undefined,
      spouse_income: 0,
    },
    mode: 'onChange',
  })

  // Get form data for auto-save
  const formData = form.watch()

  // Auto-save hook
  const { isSaving, lastSaved, error: saveError } = useAutoSave(
    formData,
    true, // enabled
    {
      delay: 1000, // 1 second debounce
      onSave: () => {
        console.log('Data auto-saved successfully')
      },
      onError: (error) => {
        console.error('Auto-save failed:', error)
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
          // Show resume banner if user has partial data
          const hasPartialData = !!(profile.age || profile.city || profile.marital_status || profile.monthly_income)
          console.log('Profile loaded:', {
            hasPartialData,
            age: profile.age,
            city: profile.city,
            marital_status: profile.marital_status,
            monthly_income: profile.monthly_income,
          })
          setShowResumeBanner(hasPartialData)

          // Pre-fill form with existing data
          form.reset({
            age: profile.age,
            city: profile.city,
            marital_status: profile.marital_status,
            dependents: profile.dependents,
            monthly_income: profile.monthly_income,
            spouse_income: profile.spouse_income || 0,
          })

          // Calculate completed steps based on filled data and current step
          // Only mark a step as complete if ALL its fields are filled AND user is past that step
          const completed: number[] = []
          const step = parseInt(searchParams.get('step') || '1')

          if (profile.age && profile.city && profile.marital_status !== undefined && profile.dependents !== undefined && step > 1) {
            completed.push(1)
          }
          if (profile.monthly_income && step > 2) {
            completed.push(2)
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
          age: formValues.age,
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
          formData.age &&
          formData.city &&
          formData.marital_status &&
          formData.dependents !== undefined &&
          formData.dependents !== null
        )
      case 2:
        return !!(formData.monthly_income && formData.monthly_income > 0)
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

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep])
    }

    if (currentStep < TOTAL_STEPS) {
      navigateToStep(currentStep + 1)
    } else {
      // Final step - mark onboarding as completed and redirect to dashboard
      setIsSubmitting(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { error } = await supabase
            .from('user_profiles')
            .update({ onboarding_completed: true })
            .eq('id', user.id)

          if (error) {
            console.error('Error marking onboarding complete:', error)
          }
        }
      } catch (error: unknown) {
        console.error('Error completing onboarding:', error)
      } finally {
        setIsSubmitting(false)
        router.push('/dashboard')
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
                      {/* Skip button for steps 4-5 */}
                      {currentStep >= 4 && (
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
      </div>
    </AnimatedBackground>
  )
}
