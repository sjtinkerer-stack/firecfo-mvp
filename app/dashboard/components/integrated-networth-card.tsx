'use client';

import { motion } from 'framer-motion';
import { Wallet, Pencil, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatIndianCurrency, formatFullIndianCurrency } from '../utils/dashboard-calculations';

interface IntegratedNetworthCardProps {
  currentNetworth: number;
  assets: {
    equity: number;
    debt: number;
    cash: number;
    realEstate: number;
    otherAssets: number;
  };
  currentAge: number;
  onEdit: () => void;
}

// Asset colors (matching current allocation chart)
const ASSET_COLORS = {
  equity: '#3b82f6', // blue
  debt: '#10b981', // emerald
  cash: '#eab308', // yellow
  realEstate: '#f97316', // orange
  other: '#a855f7', // purple
};

export function IntegratedNetworthCard({
  currentNetworth,
  assets,
  currentAge,
  onEdit,
}: IntegratedNetworthCardProps) {

  // Prepare allocation data
  const allocationData = [
    { name: 'Equity', value: assets.equity, color: ASSET_COLORS.equity },
    { name: 'Debt', value: assets.debt, color: ASSET_COLORS.debt },
    { name: 'Cash', value: assets.cash, color: ASSET_COLORS.cash },
    { name: 'Real Estate', value: assets.realEstate, color: ASSET_COLORS.realEstate },
    { name: 'Other', value: assets.otherAssets, color: ASSET_COLORS.other },
  ].filter((item) => item.value > 0);

  // Calculate percentages
  const dataWithPercentages = allocationData.map((item) => ({
    ...item,
    percentage: (item.value / currentNetworth) * 100,
  }));

  // Calculate recommended allocation
  const recommendedEquity = Math.min(Math.max(100 - currentAge, 30), 70);
  const recommendedDebt = Math.min(Math.max(currentAge, 20), 50);
  const recommendedCash = 100 - recommendedEquity - recommendedDebt;

  // Calculate allocation status with 5-tier system
  const equityPercentage = (assets.equity / currentNetworth) * 100 || 0;
  const equityDeviation = equityPercentage - recommendedEquity;
  const deviationAbs = Math.abs(equityDeviation);

  let allocationStatus: {
    type: 'well-balanced' | 'acceptable' | 'aggressive' | 'conservative' | 'needs-rebalancing';
    icon: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    title: string;
    message: string;
  };

  if (deviationAbs <= 5) {
    // Well-balanced (within ±5%)
    allocationStatus = {
      type: 'well-balanced',
      icon: '✅',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      borderColor: 'border-emerald-300 dark:border-emerald-700',
      textColor: 'text-emerald-800 dark:text-emerald-200',
      title: 'Well-balanced portfolio',
      message: `Your equity allocation (${equityPercentage.toFixed(0)}%) is on target for age ${currentAge} (recommended: ${recommendedEquity}%)`,
    };
  } else if (deviationAbs <= 10) {
    // Acceptable range (±5-10%)
    const direction = equityDeviation > 0 ? 'above' : 'below';
    allocationStatus = {
      type: 'acceptable',
      icon: 'ℹ️',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-300 dark:border-blue-700',
      textColor: 'text-blue-800 dark:text-blue-200',
      title: 'Acceptable allocation',
      message: `Your equity allocation (${equityPercentage.toFixed(0)}%) is slightly ${direction} recommended ${recommendedEquity}% but within acceptable range`,
    };
  } else {
    // Significant deviation (>10%)
    if (equityDeviation > 0) {
      // Too much equity (aggressive)
      allocationStatus = {
        type: 'aggressive',
        icon: '⚡',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        borderColor: 'border-purple-300 dark:border-purple-700',
        textColor: 'text-purple-800 dark:text-purple-200',
        title: 'Aggressive allocation',
        message: `Your equity allocation (${equityPercentage.toFixed(0)}%) is higher than recommended ${recommendedEquity}% — higher potential returns but more volatility. Consider rebalancing to reduce equity exposure.`,
      };
    } else {
      // Too much debt (conservative)
      allocationStatus = {
        type: 'conservative',
        icon: '🛡️',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
        borderColor: 'border-indigo-300 dark:border-indigo-700',
        textColor: 'text-indigo-800 dark:text-indigo-200',
        title: 'Conservative allocation',
        message: `Your equity allocation (${equityPercentage.toFixed(0)}%) is lower than recommended ${recommendedEquity}% — lower volatility but slower growth. Consider rebalancing to increase equity allocation.`,
      };
    }
  }

  const hasAssets = currentNetworth > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 p-6 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
            <Wallet className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-violet-900 dark:text-violet-100">
            Current Net Worth
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 px-3 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900"
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>

      {hasAssets ? (
        <>
          {/* Donut Chart with Centered Net Worth */}
          <div className="relative mb-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dataWithPercentages}
                  cx="50%"
                  cy="50%"
                  innerRadius={110}
                  outerRadius={140}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dataWithPercentages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  position={{ y: 0 }}
                  offset={15}
                  wrapperStyle={{ pointerEvents: 'none' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-violet-200 dark:border-violet-700">
                          <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                            {data.name}
                          </p>
                          <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">
                            {formatIndianCurrency(data.value)} ({data.percentage.toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centered Net Worth Number */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-bold text-violet-900 dark:text-violet-100">
                  {formatIndianCurrency(currentNetworth)}
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">
                  Total Net Worth
                </p>
              </div>
            </div>
          </div>

          {/* Category Badges */}
          <div className="flex flex-wrap gap-3 justify-center mb-4">
            {dataWithPercentages.map((cat) => (
              <span
                key={cat.name}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-800 dark:text-violet-200"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name} {cat.percentage.toFixed(0)}%
              </span>
            ))}
          </div>

          {/* Allocation Status Callout - Always Visible */}
          <div className={`p-3 ${allocationStatus.bgColor} border ${allocationStatus.borderColor} rounded-lg flex items-start gap-2`}>
            <span className="text-base flex-shrink-0">{allocationStatus.icon}</span>
            <div className="flex-1">
              <p className={`text-xs font-semibold ${allocationStatus.textColor}`}>
                {allocationStatus.title}
              </p>
              <p className={`text-xs ${allocationStatus.textColor} mt-1 opacity-90`}>
                {allocationStatus.message}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-violet-600 dark:text-violet-400 mb-4">
            No assets added yet
          </p>
          <Button
            onClick={onEdit}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Add Assets
          </Button>
        </div>
      )}
    </motion.div>
  );
}
