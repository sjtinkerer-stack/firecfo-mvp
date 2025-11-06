'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SuggestionCardProps {
  suggestion: number
  label: string
  onAccept: () => void
  className?: string
  formatValue?: (value: number) => string
}

export function SuggestionCard({
  suggestion,
  label,
  onAccept,
  className,
  formatValue = (val) => `₹${new Intl.NumberFormat('en-IN').format(val)}`,
}: SuggestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
      className={cn(
        'p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30',
        'border-2 border-indigo-200 dark:border-indigo-800/50 rounded-xl',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
            <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 uppercase tracking-wide">
              Suggested
            </h4>
          </div>
          <p className="text-lg text-indigo-800 dark:text-indigo-200 mb-1">{label}</p>
          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
            {formatValue(suggestion)}
            <span className="text-sm font-normal text-indigo-700 dark:text-indigo-300 ml-2">/ month</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onAccept}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
        >
          Use This
        </Button>
      </div>
    </motion.div>
  )
}
