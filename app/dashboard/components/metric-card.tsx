/**
 * MetricCard Component
 * Reusable stat card for dashboard metrics
 */

'use client';

import { motion } from 'framer-motion';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricCardProps } from '../types';

const colorThemes = {
  emerald: {
    border: 'border-emerald-200 dark:border-emerald-800',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    text: 'text-emerald-900 dark:text-emerald-100',
    accent: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },
  violet: {
    border: 'border-violet-200 dark:border-violet-800',
    bg: 'bg-violet-50 dark:bg-violet-950',
    text: 'text-violet-900 dark:text-violet-100',
    accent: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-900',
  },
  orange: {
    border: 'border-orange-200 dark:border-orange-800',
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-900 dark:text-orange-100',
    accent: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900',
  },
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-900 dark:text-blue-100',
    accent: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
  },
  amber: {
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-900 dark:text-amber-100',
    accent: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  colorTheme = 'emerald',
  trend,
  className,
}: MetricCardProps) {
  const theme = colorThemes[colorTheme];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border-2 p-6 transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-lg',
        theme.border,
        theme.bg,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className={cn('text-sm font-medium', theme.text, 'opacity-70')}>{title}</p>

          {/* Value */}
          <p className={cn('mt-2 text-3xl font-bold', theme.text)}>{value}</p>

          {/* Subtitle */}
          {subtitle && <p className={cn('mt-1 text-xs', theme.text, 'opacity-50')}>{subtitle}</p>}

          {/* Trend indicator */}
          {trend && (
            <div className="mt-3 flex items-center gap-1.5">
              {trend.isPositive ? (
                <ArrowUpIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className={cn('text-xs', theme.text, 'opacity-50')}>{trend.label}</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              theme.iconBg,
              theme.accent
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
