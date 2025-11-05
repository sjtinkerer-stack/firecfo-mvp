'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PillOption {
  value: string
  label: string
  description?: string
}

interface PillSelectorProps {
  options: PillOption[]
  value?: string
  onChange: (value: string) => void
  className?: string
  columns?: 2 | 3 | 4
  size?: 'sm' | 'md' | 'lg'
}

export function PillSelector({
  options,
  value,
  onChange,
  className,
  columns = 2,
  size = 'md',
}: PillSelectorProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  const pillSize = {
    sm: 'h-12 text-sm',
    md: 'h-14 text-base',
    lg: 'h-16 text-lg',
  }

  return (
    <div className={cn('grid gap-3', gridCols[columns], className)}>
      {options.map((option, index) => {
        const isSelected = value === option.value

        return (
          <motion.button
            key={option.value}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex items-center justify-center gap-2 rounded-xl font-medium transition-all',
              'border-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
              pillSize[size],
              isSelected
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-950/50'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check className="w-4 h-4" />
              </motion.div>
            )}
            <span>{option.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
