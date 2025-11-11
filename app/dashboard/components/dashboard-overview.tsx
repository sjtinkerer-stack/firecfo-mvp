/**
 * DashboardOverview Component
 * Main dashboard orchestrator - displays FIRE status, metrics, and charts
 */

'use client';

import { useState } from 'react';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { FireStatusBanner } from './fire-status-banner';
import { MetricCard } from './metric-card';
import { NetWorthChart } from './networth-chart';
import { AssetAllocationChart } from './asset-allocation-chart';
import { EditIncomeExpensesModal } from './edit-income-expenses-modal';
import { EditAssetsModal } from './edit-assets-modal';
import {
  generateNetWorthChartData,
  generateAssetAllocationData,
  formatIndianCurrency,
  formatFullIndianCurrency,
} from '../utils/dashboard-calculations';
import {
  TrendingUp,
  Wallet,
  Target,
  PiggyBank,
  DollarSign,
  TrendingDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export function DashboardOverview() {
  const { data, loading, error, refetch } = useDashboardData();
  const [isIncomeExpensesModalOpen, setIsIncomeExpensesModalOpen] = useState(false);
  const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
          <h3 className="mt-4 text-xl font-bold text-red-900 dark:text-red-100">
            Failed to Load Dashboard
          </h3>
          <p className="mt-2 text-red-700 dark:text-red-300">{error || 'Unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  // Generate chart data
  const networthChartData = generateNetWorthChartData(data);
  const assetAllocationData = generateAssetAllocationData(data);

  // Calculate household income
  const householdIncome = data.monthlyIncome + data.spouseIncome;

  return (
    <div className="space-y-8">
      {/* FIRE Status Banner */}
      <FireStatusBanner
        isOnTrack={data.isOnTrack}
        fireAge={data.fireAge}
        fireTargetDate={data.fireTargetDate}
        fireLifestyleType={data.fireLifestyleType}
        yearsToFire={data.yearsToFire}
        monthlySavingsNeeded={data.monthlySavingsNeeded}
        currentMonthlySavings={data.monthlySavings}
      />

      {/* Key Metrics Grid - 3 columns on desktop */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Net Worth */}
        <MetricCard
          title="Current Net Worth"
          value={formatIndianCurrency(data.currentNetworth)}
          subtitle={formatFullIndianCurrency(data.currentNetworth)}
          icon={<Wallet className="h-6 w-6" />}
          colorTheme="slate"
          onEdit={() => setIsAssetsModalOpen(true)}
        />

        {/* Required FIRE Corpus */}
        <MetricCard
          title="Required FIRE Corpus"
          value={formatIndianCurrency(data.requiredCorpus)}
          subtitle={`At ${data.safeWithdrawalRate}% SWR`}
          icon={<Target className="h-6 w-6" />}
          colorTheme="indigo"
        />

        {/* Projected Corpus */}
        <MetricCard
          title="Projected Corpus at FIRE"
          value={formatIndianCurrency(data.projectedCorpusAtFire)}
          subtitle={`By age ${data.fireAge} with 12% returns`}
          icon={<TrendingUp className="h-6 w-6" />}
          colorTheme="blue"
          badge={
            data.projectedCorpusAtFire >= data.requiredCorpus ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <span>✓</span>
                <span>
                  Surplus: {formatIndianCurrency(data.projectedCorpusAtFire - data.requiredCorpus)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400">
                <span>⚠️</span>
                <span>
                  Shortfall: {formatIndianCurrency(data.requiredCorpus - data.projectedCorpusAtFire)}
                </span>
              </div>
            )
          }
        />

        {/* Monthly Income */}
        <MetricCard
          title="Monthly Household Income"
          value={formatIndianCurrency(householdIncome)}
          subtitle={formatFullIndianCurrency(householdIncome)}
          icon={<DollarSign className="h-6 w-6" />}
          colorTheme="cyan"
          onEdit={() => setIsIncomeExpensesModalOpen(true)}
        />

        {/* Monthly Expenses */}
        <MetricCard
          title="Monthly Expenses"
          value={formatIndianCurrency(data.monthlyExpenses)}
          subtitle={formatFullIndianCurrency(data.monthlyExpenses)}
          icon={<TrendingDown className="h-6 w-6" />}
          colorTheme="sky"
          onEdit={() => setIsIncomeExpensesModalOpen(true)}
        />

        {/* Savings Rate */}
        <MetricCard
          title="Savings Rate"
          value={`${(data.savingsRate * 100).toFixed(1)}%`}
          subtitle={`${formatIndianCurrency(data.monthlySavings)}/month`}
          icon={<PiggyBank className="h-6 w-6" />}
          colorTheme="violet"
          badge={
            data.savingsRate >= 0.4 ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <span>🚀</span>
                <span>Excellent - Fast track to FIRE</span>
              </div>
            ) : data.savingsRate >= 0.2 ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                <span>✓</span>
                <span>Good progress</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400">
                <span>💡</span>
                <span>Consider increasing savings</span>
              </div>
            )
          }
        />
      </div>

      {/* Charts Grid - 2 columns on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Net Worth Growth Chart */}
        <NetWorthChart data={networthChartData} />

        {/* Asset Allocation Chart */}
        <AssetAllocationChart data={assetAllocationData} currentAge={data.age} />
      </div>

      {/* Additional Info */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Your FIRE Calculation Details
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Post-FIRE Monthly Expense</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatIndianCurrency(data.postFireMonthlyExpense)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Includes {data.lifestyleInflationAdjustment.toFixed(1)}% lifestyle inflation
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Safe Withdrawal Rate</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.safeWithdrawalRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Dynamic SWR based on FIRE age {data.fireAge}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Savings Needed</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatIndianCurrency(data.monthlySavingsNeeded)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {data.isOnTrack ? 'Current savings sufficient' : 'Increase to stay on track'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modals */}
      <EditIncomeExpensesModal
        open={isIncomeExpensesModalOpen}
        onOpenChange={setIsIncomeExpensesModalOpen}
        currentData={{
          monthlyIncome: data.monthlyIncome,
          spouseIncome: data.spouseIncome,
          monthlyExpenses: data.monthlyExpenses,
          age: data.age,
          dependents: data.dependents,
          fireAge: data.fireAge,
          fireLifestyleType: data.fireLifestyleType,
          currentNetWorth: data.currentNetworth,
          maritalStatus: data.maritalStatus,
        }}
        onSave={refetch}
      />

      <EditAssetsModal
        open={isAssetsModalOpen}
        onOpenChange={setIsAssetsModalOpen}
        currentData={{
          equity: data.equity,
          debt: data.debt,
          cash: data.cash,
          realEstate: data.realEstate,
          otherAssets: data.otherAssets,
          age: data.age,
          dependents: data.dependents,
          fireAge: data.fireAge,
          fireLifestyleType: data.fireLifestyleType,
          monthlyIncome: data.monthlyIncome,
          spouseIncome: data.spouseIncome,
          monthlyExpenses: data.monthlyExpenses,
        }}
        onSave={refetch}
      />
    </div>
  );
}
