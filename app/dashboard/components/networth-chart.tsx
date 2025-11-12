/**
 * NetWorthChart Component
 * Area chart showing net worth growth from current to FIRE age
 * Shows: Current NW → Projected Corpus → Required Corpus
 */

'use client';

import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { NetWorthChartDataPoint } from '../types';
import { formatIndianCurrency } from '../utils/dashboard-calculations';

interface NetWorthChartProps {
  data: NetWorthChartDataPoint[];
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="rounded-lg border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{dataPoint.label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Age {dataPoint.age}</p>
          <div className="mt-2 space-y-1">
            {dataPoint.currentNetworth !== undefined && (
              <p className="text-sm">
                <span className="text-blue-600 dark:text-blue-400">Current: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatIndianCurrency(dataPoint.currentNetworth)}
                </span>
              </p>
            )}
            {dataPoint.projectedCorpus !== undefined && dataPoint.projectedCorpus > 0 && (
              <p className="text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">Projected: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatIndianCurrency(dataPoint.projectedCorpus)}
                </span>
              </p>
            )}
            {dataPoint.requiredCorpus !== undefined && dataPoint.requiredCorpus > 0 && (
              <p className="text-sm">
                <span className="text-violet-600 dark:text-violet-400">Required: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatIndianCurrency(dataPoint.requiredCorpus)}
                </span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    return formatIndianCurrency(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
            Net Worth Growth Projection
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 opacity-70">
            Your wealth journey to FIRE
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRequired" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              className="dark:stroke-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#6b7280"
              className="dark:stroke-gray-400"
              tick={{ fontSize: 12 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Projected Corpus Area */}
            <Area
              type="monotone"
              dataKey="projectedCorpus"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorProjected)"
              name="Projected Corpus"
            />

            {/* Required Corpus Reference Line */}
            <Area
              type="monotone"
              dataKey="requiredCorpus"
              stroke="#8b5cf6"
              strokeWidth={3}
              strokeDasharray="5 5"
              fillOpacity={0}
              name="Required Corpus"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend explanation */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-blue-700 dark:text-blue-300">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
          <span>Projected growth with 12% annual returns + monthly savings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border-2 border-violet-500 bg-transparent"></div>
          <span>Required corpus for your FIRE goal</span>
        </div>
      </div>
    </motion.div>
  );
}
