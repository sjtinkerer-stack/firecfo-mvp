/**
 * FireStatusBanner Component
 * Large prominent banner showing FIRE goal status
 */

'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FireStatusBannerProps } from '../types';
import { formatIndianCurrency } from '../utils/dashboard-calculations';
import {
  calculateFireCountdown,
  formatFireTargetDate,
} from '@/app/utils/date-helpers';

export function FireStatusBanner({
  isOnTrack,
  fireAge,
  fireTargetDate,
  fireLifestyleType,
  yearsToFire,
  monthlySavingsNeeded,
  currentMonthlySavings,
}: FireStatusBannerProps) {
  const targetYear = new Date().getFullYear() + yearsToFire;
  const lifestyleLabel = {
    lean: 'Lean FIRE',
    standard: 'Standard FIRE',
    fat: 'Fat FIRE',
  }[fireLifestyleType];

  const savingsGap = Math.max(0, monthlySavingsNeeded - currentMonthlySavings);

  // Calculate detailed countdown (years, months, days)
  const countdown = fireTargetDate ? calculateFireCountdown(fireTargetDate) : null;
  const formattedTargetDate = fireTargetDate ? formatFireTargetDate(fireTargetDate) : `${targetYear}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-2xl border-2 p-8',
        isOnTrack
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-950 dark:to-emerald-900'
          : 'border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 dark:border-amber-700 dark:from-amber-950 dark:to-amber-900'
      )}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: Status & Message */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full',
              isOnTrack
                ? 'bg-emerald-200 dark:bg-emerald-800'
                : 'bg-amber-200 dark:bg-amber-800'
            )}
          >
            {isOnTrack ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
            ) : (
              <AlertTriangle className="h-7 w-7 text-amber-700 dark:text-amber-300" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2
                className={cn(
                  'text-2xl font-bold',
                  isOnTrack
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-amber-900 dark:text-amber-100'
                )}
              >
                {isOnTrack ? 'On Track to FIRE' : 'Needs Adjustment'}
              </h2>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  isOnTrack
                    ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                )}
              >
                {lifestyleLabel}
              </span>
            </div>

            <p
              className={cn(
                'text-lg',
                isOnTrack
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'
              )}
            >
              {isOnTrack ? (
                <>
                  You&apos;re on track to achieve <strong>{lifestyleLabel}</strong> by age{' '}
                  <strong>{fireAge}</strong> in <strong>{formattedTargetDate}</strong>
                </>
              ) : (
                <>
                  You&apos;re{' '}
                  {countdown ? (
                    <strong>
                      {countdown.years}y {countdown.months}m
                    </strong>
                  ) : (
                    <strong>{yearsToFire} years</strong>
                  )}{' '}
                  from your FIRE goal at age <strong>{fireAge}</strong>
                </>
              )}
            </p>

            {/* Action items if not on track */}
            {!isOnTrack && savingsGap > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Action needed:</strong> Increase monthly savings by{' '}
                  <strong>{formatIndianCurrency(savingsGap)}</strong> or extend your FIRE timeline
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Stats */}
        <div className="flex gap-4 md:flex-col md:items-end">
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center gap-1.5 md:justify-end">
              <Target
                className={cn(
                  'h-4 w-4',
                  isOnTrack
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                )}
              />
              <p
                className={cn(
                  'text-xs font-medium uppercase tracking-wide',
                  isOnTrack
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-amber-700 dark:text-amber-300',
                  'opacity-70'
                )}
              >
                Years to FIRE
              </p>
            </div>
            {countdown ? (
              <>
                <div className="mt-1 flex items-baseline gap-1.5 justify-center md:justify-end">
                  <span
                    className={cn(
                      'text-3xl font-bold',
                      isOnTrack
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-amber-900 dark:text-amber-100'
                    )}
                  >
                    {countdown.years}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isOnTrack
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-amber-700 dark:text-amber-300'
                    )}
                  >
                    years
                  </span>
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      isOnTrack
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-amber-900 dark:text-amber-100'
                    )}
                  >
                    {countdown.months}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isOnTrack
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-amber-700 dark:text-amber-300'
                    )}
                  >
                    months
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xs mt-1',
                    isOnTrack
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300',
                    'opacity-60'
                  )}
                >
                  Target: {formattedTargetDate}
                </p>
              </>
            ) : (
              <>
                <p
                  className={cn(
                    'mt-1 text-3xl font-bold',
                    isOnTrack
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-amber-900 dark:text-amber-100'
                  )}
                >
                  {yearsToFire}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    isOnTrack
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300',
                    'opacity-60'
                  )}
                >
                  By {targetYear}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
