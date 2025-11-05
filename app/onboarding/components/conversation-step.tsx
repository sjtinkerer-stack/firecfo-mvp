'use client'

import { ReactNode, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { scrollToElement, shouldScrollOnMount } from '../utils/scroll-helpers'

interface ConversationStepProps {
  question: string
  tooltip?: string
  children: ReactNode
  icon?: ReactNode
  required?: boolean
  error?: string
  scrollOnMount?: boolean // Controls auto-scroll behavior
}

export function ConversationStep({
  question,
  tooltip,
  children,
  icon,
  required = true,
  error,
  scrollOnMount = true,
}: ConversationStepProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasScrolled = useRef(false)

  // Auto-scroll to question when it appears
  useEffect(() => {
    // Only scroll once on mount
    if (!scrollOnMount || hasScrolled.current) return

    // Check if scrolling is appropriate
    if (!shouldScrollOnMount()) return

    // Delay scroll to allow Framer Motion animation to complete
    // Animation duration is 0.5s, we add 0.3s delay for smooth transition
    const scrollTimeout = setTimeout(() => {
      scrollToElement(containerRef.current, {
        delay: 0,
      })
      hasScrolled.current = true
    }, 800) // 500ms animation + 300ms buffer

    return () => clearTimeout(scrollTimeout)
  }, [scrollOnMount])

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="space-y-5"
    >
      {/* Question Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {icon && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            >
              {icon}
            </motion.div>
          )}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {question}
            {required && (
              <span className="text-red-500 dark:text-red-400 ml-1" aria-label="Required field">
                *
              </span>
            )}
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 ring-1 ring-emerald-200 dark:ring-emerald-800/50 transition-all duration-200 hover:scale-105"
                    >
                      <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm">
                    <p className="leading-relaxed">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h2>
        </div>
      </div>

      {/* Answer Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="pt-2"
      >
        {children}
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  )
}
