'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Lightbulb, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MicroFeedbackProps {
  message: string
  variant?: 'success' | 'info' | 'tip'
  show?: boolean
}

export function MicroFeedback({
  message,
  variant = 'info',
  show = true,
}: MicroFeedbackProps) {
  const variants = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
      text: 'text-emerald-800 dark:text-emerald-200',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    info: {
      icon: TrendingUp,
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50',
      text: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    tip: {
      icon: Lightbulb,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
      text: 'text-amber-800 dark:text-amber-200',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  }

  const config = variants[variant]
  const Icon = config.icon

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border overflow-hidden',
            config.bg
          )}
        >
          <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.iconColor)} strokeWidth={1.5} />
          <p className={cn('text-sm leading-relaxed', config.text)}>{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
