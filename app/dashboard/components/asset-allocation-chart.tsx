/**
 * AssetAllocationChart Component
 * Pie chart showing current asset allocation breakdown
 */

'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChartIcon, AlertCircle } from 'lucide-react';
import { AssetAllocation } from '../types';
import { formatIndianCurrency, getRecommendedAllocation } from '../utils/dashboard-calculations';

interface AssetAllocationChartProps {
  data: AssetAllocation[];
  currentAge: number;
}

export function AssetAllocationChart({ data, currentAge }: AssetAllocationChartProps) {
  const recommended = getRecommendedAllocation(currentAge);
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate current allocation percentages
  const currentEquity = data.find((d) => d.name === 'Equity')?.percentage || 0;
  const currentDebt = data.find((d) => d.name === 'Debt')?.percentage || 0;

  // Check if rebalancing needed (>10% deviation)
  const needsRebalancing =
    Math.abs(currentEquity - recommended.equity) > 10 ||
    Math.abs(currentDebt - recommended.debt) > 10;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="mt-1 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Amount: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatIndianCurrency(data.value)}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Allocation: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {data.payload.percentage.toFixed(1)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percentage < 5) return null; // Hide labels for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  if (totalValue === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-violet-200 bg-violet-50 p-6 dark:border-violet-800 dark:bg-violet-950"
      >
        <PieChartIcon className="h-16 w-16 text-violet-400 opacity-50" />
        <p className="mt-4 text-center text-lg font-medium text-violet-700 dark:text-violet-300">
          No assets added yet
        </p>
        <p className="mt-2 text-center text-sm text-violet-600 dark:text-violet-400">
          Add your assets to see allocation breakdown
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6 dark:border-violet-800 dark:bg-violet-950"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
          <PieChartIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-violet-900 dark:text-violet-100">
            Asset Allocation
          </h3>
          <p className="text-sm text-violet-700 dark:text-violet-300 opacity-70">
            Current portfolio breakdown
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-sm text-violet-700 dark:text-violet-300">
                  {value} ({entry.payload.percentage.toFixed(1)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendation */}
      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2 rounded-lg bg-violet-100 p-3 dark:bg-violet-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" />
          <div className="flex-1">
            <p className="text-xs font-medium text-violet-800 dark:text-violet-200">
              Recommended allocation for age {currentAge}:
            </p>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-violet-700 dark:text-violet-300">
              <span>Equity: {recommended.equity}%</span>
              <span>Debt: {recommended.debt}%</span>
              <span>Cash: {recommended.cash}%</span>
            </div>
            {needsRebalancing && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                ⚠️ Consider rebalancing - deviation &gt;10%
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
