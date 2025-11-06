'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  label: string
  value: number
  percentage: number
  color: string
  formatValue?: (value: number) => string
}

export function ProgressBar({
  label,
  value,
  percentage,
  color,
  formatValue = (val) => `₹${new Intl.NumberFormat('en-IN').format(val)}`,
}: ProgressBarProps) {
  // Color mapping for different asset categories
  const colorClasses = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    violet: 'bg-violet-500',
  }

  const bgColorClass = colorClasses[color as keyof typeof colorClasses] || 'bg-gray-500'

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}:</span>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{formatValue(value)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">({percentage}%)</span>
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full', bgColorClass)}
        />
      </div>
    </div>
  )
}
