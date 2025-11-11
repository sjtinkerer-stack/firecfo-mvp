'use client';

import { ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImpactPreviewProps {
  before: {
    fireAge: number;
    yearsToFire: number;
    safeWithdrawalRate: number;
    requiredCorpus: number;
  };
  after: {
    fireAge: number;
    yearsToFire: number;
    safeWithdrawalRate: number;
    requiredCorpus: number;
  };
}

export function ImpactPreview({ before, after }: ImpactPreviewProps) {
  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    } else {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value);
    }
  };

  const getTargetYear = (yearsAway: number) => {
    const currentYear = new Date().getFullYear();
    return currentYear + yearsAway;
  };

  // Calculate changes
  const swrChange = after.safeWithdrawalRate - before.safeWithdrawalRate;
  const corpusChange = after.requiredCorpus - before.requiredCorpus;
  const yearsChange = after.yearsToFire - before.yearsToFire;

  // Determine if changes are improvements
  const swrImproved = swrChange > 0; // Higher SWR = better (lower corpus needed)
  const corpusImproved = corpusChange < 0; // Lower corpus = better
  const yearsImproved = yearsChange > 0; // More time = usually better

  const getChangeIcon = (change: number, higherIsBetter: boolean) => {
    if (Math.abs(change) < 0.01) return <Minus className="h-4 w-4 text-gray-500" />;
    const isPositive = change > 0;
    const isImprovement = higherIsBetter ? isPositive : !isPositive;

    if (isImprovement) {
      return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
  };

  const getChangeColor = (change: number, higherIsBetter: boolean) => {
    if (Math.abs(change) < 0.01) return 'text-gray-600 dark:text-gray-400';
    const isPositive = change > 0;
    const isImprovement = higherIsBetter ? isPositive : !isPositive;
    return isImprovement
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Impact Preview</h4>
      </div>

      {/* Comparison Grid */}
      <div className="space-y-3">
        {/* FIRE Age */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Target FIRE Age
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {before.fireAge} years
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {after.fireAge} years
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {before.yearsToFire} years away ({getTargetYear(before.yearsToFire)}) → {after.yearsToFire} years away ({getTargetYear(after.yearsToFire)})
          </p>
        </div>

        {/* Safe Withdrawal Rate */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Safe Withdrawal Rate
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {before.safeWithdrawalRate}%
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {after.safeWithdrawalRate}%
            </span>
          </div>
          {swrChange !== 0 && (
            <div className={cn('mt-1 flex items-center gap-1 text-xs', getChangeColor(swrChange, true))}>
              {getChangeIcon(swrChange, true)}
              <span>
                {swrChange > 0 ? '+' : ''}
                {swrChange.toFixed(1)}%
                {swrImproved ? ' (better - can withdraw more annually)' : ' (lower withdrawal rate)'}
              </span>
            </div>
          )}
        </div>

        {/* Required Corpus */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Required FIRE Corpus
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(before.requiredCorpus)}
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(after.requiredCorpus)}
            </span>
          </div>
          {Math.abs(corpusChange) > 50000 && (
            <div className={cn('mt-1 flex items-center gap-1 text-xs', getChangeColor(corpusChange, false))}>
              {getChangeIcon(corpusChange, false)}
              <span>
                {corpusChange > 0 ? '+' : ''}
                {formatCurrency(Math.abs(corpusChange))}
                {corpusImproved ? ' less needed' : ' more needed'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary - Only show if meaningful changes */}
      {(Math.abs(yearsChange) > 0 || Math.abs(corpusChange) > 100000 || Math.abs(swrChange) > 0.1) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            💡 Summary
          </p>
          <ul className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-200">
            {yearsChange > 0 && (
              <li>✅ {yearsChange} more {yearsChange === 1 ? 'year' : 'years'} to save and grow your wealth</li>
            )}
            {yearsChange < 0 && (
              <li>⚠️ {Math.abs(yearsChange)} fewer {Math.abs(yearsChange) === 1 ? 'year' : 'years'} to reach your goal</li>
            )}
            {swrImproved && Math.abs(swrChange) > 0.1 && (
              <li>✅ Higher safe withdrawal rate (+{swrChange.toFixed(1)}%) means lower corpus requirement</li>
            )}
            {corpusImproved && Math.abs(corpusChange) > 100000 && (
              <li>✅ Required corpus reduced by {formatCurrency(Math.abs(corpusChange))} - easier to achieve</li>
            )}
            {!corpusImproved && corpusChange > 100000 && (
              <li>⚠️ Higher corpus needs {formatCurrency(Math.abs(corpusChange))} more - requires aggressive savings or longer timeline</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
