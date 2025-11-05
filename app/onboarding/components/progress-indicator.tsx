import { motion } from 'framer-motion'
import { Check, User, DollarSign, TrendingDown, Wallet, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep: number
  completedSteps: number[]
}

const steps = [
  {
    number: 1,
    label: 'Personal',
    icon: User,
    benefit: 'Understanding your life stage'
  },
  {
    number: 2,
    label: 'Income',
    icon: DollarSign,
    benefit: 'Calculating your savings potential'
  },
  {
    number: 3,
    label: 'Expenses',
    icon: TrendingDown,
    benefit: 'Identifying optimization opportunities'
  },
  {
    number: 4,
    label: 'Net Worth',
    icon: Wallet,
    benefit: 'Tracking your wealth journey'
  },
  {
    number: 5,
    label: 'FIRE Goal',
    icon: Target,
    benefit: 'Building your freedom roadmap'
  },
]

export function ProgressIndicator({ currentStep, completedSteps }: ProgressIndicatorProps) {
  return (
    <div className="w-full mb-8">
      {/* Mobile: Simple text progress */}
      <div className="block md:hidden mb-4">
        <div className="flex items-center justify-center mb-2">
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </p>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
            initial={{ width: `${(currentStep / steps.length) * 100}%` }}
            animate={{ width: `${(currentStep / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Desktop: Full progress with icons */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress stepper */}
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-10">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                initial={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.number)
              const isCurrent = currentStep === step.number
              const Icon = step.icon

              return (
                <div key={step.number} className="flex flex-col items-center gap-2 relative">
                  <motion.div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                      isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                      isCurrent && !isCompleted && 'border-emerald-500 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400',
                      !isCurrent && !isCompleted && 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                    )}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: isCurrent ? 1.1 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </motion.div>
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors',
                      (isCurrent || isCompleted) && 'text-emerald-600 dark:text-emerald-400',
                      !isCurrent && !isCompleted && 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Step counter */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
